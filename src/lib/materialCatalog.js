export const MATERIAL_CATALOG_STORAGE_KEY = 'material-catalog-v1';

export const seedMaterialCatalog = [
    {
        id: 'cat-obojeni',
        name: 'Obojeni metali',
        subcategories: [
            {
                id: 'sub-cu',
                name: 'Bakar',
                materials: [
                    {
                        id: 'mat-cu-mb',
                        code: 'CU-MB',
                        name: 'Bakar Millberry',
                        unit: 'KG',
                        submaterials: [
                            {
                                id: 'submat-cu-mb-cist',
                                name: 'Millberry cist',
                                composition: [
                                    { element: 'Cu', percent: 99.9 },
                                    { element: 'Fe', percent: 0.1 },
                                ],
                            },
                            {
                                id: 'submat-cu-mb-mix',
                                name: 'Millberry mix',
                                composition: [
                                    { element: 'Cu', percent: 96.0 },
                                    { element: 'Fe', percent: 2.0 },
                                    { element: 'Al', percent: 2.0 },
                                ],
                            },
                        ],
                    },
                ],
            },
            {
                id: 'sub-al',
                name: 'Aluminij',
                materials: [
                    {
                        id: 'mat-al-prf',
                        code: 'AL-PRF',
                        name: 'Alu profil',
                        unit: 'KG',
                        submaterials: [
                            {
                                id: 'submat-al-prf-cist',
                                name: 'Profil cist',
                                composition: [
                                    { element: 'Al', percent: 98.0 },
                                    { element: 'Fe', percent: 2.0 },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
    {
        id: 'cat-crni',
        name: 'Crni metali',
        subcategories: [
            {
                id: 'sub-fe',
                name: 'Zeljezo',
                materials: [
                    {
                        id: 'mat-fe-e3',
                        code: 'FE-E3',
                        name: 'Teski celik E3',
                        unit: 'KG',
                        submaterials: [
                            {
                                id: 'submat-fe-e3-hms',
                                name: 'HMS standard',
                                composition: [
                                    { element: 'Fe', percent: 96.0 },
                                    { element: 'Cu', percent: 1.0 },
                                    { element: 'Al', percent: 3.0 },
                                ],
                            },
                        ],
                    },
                ],
            },
        ],
    },
];

export function getMaterialCatalog() {
    if (typeof window === 'undefined') {
        return seedMaterialCatalog;
    }

    try {
        const raw = localStorage.getItem(MATERIAL_CATALOG_STORAGE_KEY);
        if (!raw) {
            return seedMaterialCatalog;
        }
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : seedMaterialCatalog;
    } catch {
        return seedMaterialCatalog;
    }
}

export function saveMaterialCatalog(catalog) {
    if (typeof window === 'undefined') {
        return;
    }
    localStorage.setItem(MATERIAL_CATALOG_STORAGE_KEY, JSON.stringify(catalog));
}

export function flattenMaterialCatalog(catalog) {
    const safeCatalog = Array.isArray(catalog) ? catalog : [];
    return safeCatalog.flatMap((category) =>
        (category.subcategories || []).flatMap((subcategory) =>
            (subcategory.materials || []).flatMap((material) => {
                const variants = Array.isArray(material.submaterials) ? material.submaterials : [];
                if (!variants.length) {
                    return [{
                        id: `${material.id || material.code}-base`,
                        materialId: material.id || null,
                        variantId: null,
                        code: material.code,
                        materialName: material.name,
                        name: material.name,
                        displayName: `${material.code} - ${material.name}`,
                        categoryName: category.name,
                        subcategoryName: subcategory.name,
                        unit: material.unit || 'KG',
                        composition: [],
                    }];
                }
                return variants.map((submaterial) => ({
                    id: submaterial.id,
                    materialId: material.id || null,
                    variantId: submaterial.id || null,
                    code: material.code,
                    materialName: material.name,
                    name: submaterial.name,
                    displayName: `${material.code} - ${material.name} / ${submaterial.name}`,
                    categoryName: category.name,
                    subcategoryName: subcategory.name,
                    unit: material.unit || 'KG',
                    composition: submaterial.composition || [],
                }));
            })
        )
    );
}

export function compositionTotal(composition) {
    return (composition || []).reduce((sum, row) => sum + (Number(row.percent) || 0), 0);
}
