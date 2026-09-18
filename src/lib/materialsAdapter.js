export function normalizeApiList(response) {
    const payload = response?.data?.data ?? response?.data;
    if (Array.isArray(payload)) {
        return payload;
    }
    if (Array.isArray(payload?.items)) {
        return payload.items;
    }
    return [];
}

export function resolveBackendMaterial(materials, pickedMaterial) {
    if (!pickedMaterial) {
        return null;
    }
    if (!Array.isArray(materials) || materials.length === 0) {
        return null;
    }

    const backendMaterialId = String(pickedMaterial.backendMaterialId || '').toLowerCase();
    if (backendMaterialId) {
        const byBackendId = materials.find((row) => String(row.id || '').toLowerCase() === backendMaterialId);
        if (byBackendId) {
            return byBackendId;
        }
    }

    const pickedMaterialId = String(pickedMaterial.materialId || '').toLowerCase();
    if (pickedMaterialId) {
        const byId = materials.find((row) => String(row.id || '').toLowerCase() === pickedMaterialId);
        if (byId) {
            return byId;
        }
    }

    const byCode = materials.find((row) => String(row.code || '').toLowerCase() === String(pickedMaterial.code || '').toLowerCase());
    if (byCode) {
        return byCode;
    }

    const byName = materials.find((row) => String(row.name || '').toLowerCase() === String(pickedMaterial.materialName || pickedMaterial.name || '').toLowerCase());
    return byName || null;
}

export function resolveBackendVariant(material, pickedMaterial) {
    if (!material || !pickedMaterial) {
        return null;
    }
    const variantId = String(pickedMaterial.variantId || '').toLowerCase();
    if (variantId) {
        const byId = (material.variants || []).find((row) => String(row.id || '').toLowerCase() === variantId);
        if (byId) return byId;
    }
    const variantName = String(pickedMaterial.name || '').toLowerCase();
    if (!variantName) return null;
    return (material.variants || []).find((row) => String(row.grade || '').toLowerCase() === variantName) || null;
}

export function formatPickedMaterial(pickedMaterial) {
    if (!pickedMaterial) {
        return '';
    }
    return pickedMaterial.displayName || `${pickedMaterial.code} - ${pickedMaterial.name}`;
}
