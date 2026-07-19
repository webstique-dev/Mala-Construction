const materialRepository = require('../repositories/material.repository');
const { findOrCreateSupplier } = require('./lookupService');
const { calculateMaterialTotal } = require('../utils/calculations');
const { resolveSiteScope, assertSiteAccess } = require('../utils/siteScope');
const { buildPaginatedResult, buildSort, buildTextSearchFilter, buildDateRangeFilter } = require('../utils/pagination');
const { uploadBuffer, deleteAsset } = require('./uploadService');
const { recordActivity } = require('./auditLogService');
const { createNotification } = require('../utils/notificationCreator');
const ApiError = require('../utils/ApiError');

async function createMaterial(data, actor, file, req) {
  assertSiteAccess(actor, data.site);

  const supplier = await findOrCreateSupplier(data.supplierName, data.site, actor._id);
  const totalAmount = calculateMaterialTotal(data);

  let invoiceUpload = null;
  if (file) {
    invoiceUpload = await uploadBuffer(file.buffer, `mala-erp/materials/invoices`, file.mimetype === 'application/pdf' ? 'raw' : 'image');
  }

  const material = await materialRepository.create({
    site: data.site,
    invoiceNumber: data.invoiceNumber,
    supplier: supplier._id,
    materialName: data.materialName,
    category: data.category,
    quantity: data.quantity,
    unit: data.unit,
    rate: data.rate,
    tax: data.tax ?? 0,
    transportCharge: data.transportCharge ?? 0,
    discount: data.discount ?? 0,
    totalAmount,
    date: data.date,
    invoiceUpload,
    notes: data.notes,
    createdBy: actor._id,
  });

  await recordActivity({
    actor, action: 'create', entityType: 'Material', entityId: material._id, site: data.site, after: material.toObject(), req,
  });

  // Notify: Material Added & Low Stock check
  await createNotification({
    recipient: null,
    type: 'system_update',
    title: 'Material Purchase Added',
    message: `${actor.name} added ${data.quantity} ${data.unit} of ${data.materialName} under Invoice #${data.invoiceNumber}.`,
    relatedEntity: { kind: 'Material', id: material._id },
    site: data.site
  });

  if (Number(data.quantity) < 10) {
    await createNotification({
      recipient: null,
      type: 'low_stock',
      title: 'Low Stock Alert',
      message: `Alert: Material ${data.materialName} quantity logged is low (${data.quantity} ${data.unit}).`,
      relatedEntity: { kind: 'Material', id: material._id },
      site: data.site,
      priority: 'high'
    });
  }

  return materialRepository.findById(material._id);
}

async function listMaterials(queryParams, actor) {
  const { page, limit, search, category, supplier, startDate, endDate, sortBy, sortOrder, siteId, showDeleted } = queryParams;
  const siteFilter = resolveSiteScope(actor, siteId);

  const query = {
    ...siteFilter,
    ...(category && { category }),
    ...(supplier && { supplier }),
    ...buildDateRangeFilter(startDate, endDate, 'date'),
    ...buildTextSearchFilter(search, ['materialName', 'invoiceNumber']),
  };

  const sort = buildSort(sortBy, sortOrder, ['date', 'totalAmount', 'materialName', 'createdAt'], 'date');
  const { items, total } = await materialRepository.findAll(query, { page, limit, sort }, showDeleted === 'true' || showDeleted === true);
  return buildPaginatedResult(items, total, page, limit);
}

async function getMaterialById(id, actor) {
  const material = await materialRepository.findById(id);
  if (!material) throw ApiError.notFound('Material not found');
  assertSiteAccess(actor, material.site._id ?? material.site);
  return material;
}

async function updateMaterial(id, data, actor, file, req) {
  const before = await getMaterialById(id, actor);

  const update = { ...data };
  if (data.supplierName) {
    const siteId = before.site._id ?? before.site;
    const supplier = await findOrCreateSupplier(data.supplierName, siteId, actor._id);
    update.supplier = supplier._id;
    delete update.supplierName;
  }

  const merged = {
    quantity: update.quantity ?? before.quantity,
    rate: update.rate ?? before.rate,
    tax: update.tax ?? before.tax,
    transportCharge: update.transportCharge ?? before.transportCharge,
    discount: update.discount ?? before.discount,
  };
  update.totalAmount = calculateMaterialTotal(merged);

  if (file) {
    if (before.invoiceUpload?.publicId) {
      await deleteAsset(before.invoiceUpload.publicId, before.invoiceUpload.url?.endsWith('.pdf') ? 'raw' : 'image');
    }
    update.invoiceUpload = await uploadBuffer(
      file.buffer,
      'mala-erp/materials/invoices',
      file.mimetype === 'application/pdf' ? 'raw' : 'image'
    );
  }

  const updated = await materialRepository.updateById(id, update);
  await recordActivity({
    actor, action: 'update', entityType: 'Material', entityId: id,
    site: before.site._id ?? before.site, before: before.toObject(), after: updated.toObject(), req,
  });
  return updated;
}

async function deleteMaterial(id, actor, req) {
  const material = await getMaterialById(id, actor);
  // Soft delete the material
  await materialRepository.softDelete(id, actor);
  await recordActivity({
    actor, action: 'delete', entityType: 'Material', entityId: id,
    site: material.site._id ?? material.site, before: material.toObject(), req,
  });
}

async function restoreMaterial(id, actor, req) {
  const material = await materialRepository.findById(id, true); // Include deleted
  if (!material) {
    throw new ApiError(404, 'Material not found');
  }
  if (!material.isDeleted) {
    throw new ApiError(400, 'Material is not deleted');
  }
  
  const restored = await materialRepository.restore(id);
  await recordActivity({
    actor, action: 'restore', entityType: 'Material', entityId: id,
    site: material.site._id ?? material.site, after: restored.toObject(), req,
  });
  return restored;
}

module.exports = { createMaterial, listMaterials, getMaterialById, updateMaterial, deleteMaterial, restoreMaterial };
