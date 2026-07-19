const Site = require('../models/Site');
const User = require('../models/User');
const Worker = require('../models/Worker');
const Material = require('../models/Material');
const WorkerPayment = require('../models/WorkerPayment');
const Expense = require('../models/Expense');
const { resolveSiteScope } = require('../utils/siteScope');
const { escapeRegex } = require('../utils/regex');

async function globalSearch(queryParams, actor) {
  const { q, limit, siteId, showDeleted } = queryParams;
  const regex = new RegExp(escapeRegex(q), 'i');
  const siteFilter = resolveSiteScope(actor, siteId);
  const perType = Math.ceil(limit / 6);
  const isDeletedFilter = showDeleted ? {} : { isDeleted: false };

  const siteQuery = actor.role === 'super_admin'
    ? { $or: [{ name: regex }, { code: regex }], ...isDeletedFilter }
    : { _id: actor.assignedSite, name: regex, ...isDeletedFilter };

  const scopedMatch = (extra = {}) => ({ ...siteFilter, ...isDeletedFilter, ...extra });

  const [sites, siteAdmins, workers, materials, payments, expenses] = await Promise.all([
    Site.find(siteQuery).limit(perType).select('name code status'),

    actor.role === 'super_admin'
      ? User.find({ role: 'site_admin', $or: [{ name: regex }, { email: regex }, { phone: regex }], ...isDeletedFilter })
          .limit(perType).select('name email phone status').populate('assignedSite', 'name')
      : [],

    Worker.find(scopedMatch({ $or: [{ name: regex }, { phone: regex }] }))
      .limit(perType).select('name phone status').populate('site', 'name'),

    Material.find(scopedMatch({ $or: [{ materialName: regex }, { invoiceNumber: regex }] }))
      .limit(perType).select('materialName invoiceNumber totalAmount date').populate('site', 'name'),

    WorkerPayment.find(scopedMatch())
      .populate({ path: 'worker', match: { name: regex, ...isDeletedFilter }, select: 'name' })
      .limit(perType)
      .select('netSalary paidOn status')
      .populate('site', 'name')
      .then((items) => items.filter((p) => p.worker)),

    Expense.find(scopedMatch({ $or: [{ title: regex }, { vendor: regex }] }))
      .limit(perType).select('title amount date vendor').populate('site', 'name'),
  ]);

  return {
    sites,
    siteAdmins,
    workers,
    materials,
    payments,
    expenses,
    total: sites.length + siteAdmins.length + workers.length + materials.length + payments.length + expenses.length,
  };
}

module.exports = { globalSearch };
