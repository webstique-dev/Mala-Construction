const PHONE_REGEX = /^\+?[0-9\s().-]{7,15}$/;

function normalizeText(value) {
  if (value === undefined || value === null) return '';
  return String(value).trim();
}

function applyProfileUpdates(user, profileData, { removePhoto, photo, deleteAsset } = {}) {
  const parsedProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData || {};
  const changedFields = [];

  if (parsedProfile.name !== undefined) {
    const value = normalizeText(parsedProfile.name);
    if (user.name !== value) {
      user.name = value;
      changedFields.push('name');
    }
  }

  if (parsedProfile.email !== undefined) {
    const value = normalizeText(parsedProfile.email).toLowerCase();
    if (user.email !== value) {
      user.email = value;
      changedFields.push('email');
    }
  }

  if (parsedProfile.phone !== undefined) {
    const value = normalizeText(parsedProfile.phone);
    if (value && !PHONE_REGEX.test(value)) {
      throw new Error('Invalid phone number');
    }
    if (user.phone !== value) {
      user.phone = value;
      changedFields.push('phone');
    }
  }

  if (parsedProfile.address !== undefined) {
    const value = normalizeText(parsedProfile.address);
    if (user.address !== value) {
      user.address = value;
      changedFields.push('address');
    }
  }

  if (parsedProfile.designation !== undefined) {
    const value = normalizeText(parsedProfile.designation);
    if (user.designation !== value) {
      user.designation = value;
      changedFields.push('designation');
    }
  }

  if (parsedProfile.company !== undefined || parsedProfile.companyInfo !== undefined) {
    const value = normalizeText(parsedProfile.company ?? parsedProfile.companyInfo);
    if (user.companyInfo !== value) {
      user.companyInfo = value;
      changedFields.push('companyInfo');
    }
  }

  if (parsedProfile.username !== undefined) {
    const value = normalizeText(parsedProfile.username);
    if (user.username !== value) {
      user.username = value;
      changedFields.push('username');
    }
  }

  if (parsedProfile.biography !== undefined || parsedProfile.bio !== undefined) {
    const value = normalizeText(parsedProfile.biography ?? parsedProfile.bio);
    if (user.biography !== value) {
      user.biography = value;
      changedFields.push('biography');
    }
  }

  if (removePhoto) {
    if (user.photo && user.photo.publicId) {
      if (deleteAsset) {
        deleteAsset(user.photo.publicId);
      }
    }
    if (user.photo?.url !== null || user.photo?.publicId !== null) {
      user.photo = { url: null, publicId: null };
      changedFields.push('photo');
    }
  }

  if (photo) {
    user.photo = photo;
    changedFields.push('photo');
  }

  return { user, changedFields };
}

module.exports = { applyProfileUpdates };
