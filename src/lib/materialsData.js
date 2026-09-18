// Flat list of materials for MaterialPicker and catalog use
// Chemical data: Cu%, Al%, Fe%, Zn%, Pb%, Ni% etc. (typical scrap metal composition)

export const materialCategories = [
    {
        category: 'OBOJENI METALI',
        items: [
            { code: 'CU-MB', name: 'Bakar Millberry (I)', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 99.9, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Millberry čist', condition: 'Nov/Čist', minPurity: 99.9, buyPrice: 12.42, chemicalData: { cu: 99.9, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 } },
                    { grade: 'Millberry žica', condition: 'Polovan', minPurity: 99.0, buyPrice: 12.00, chemicalData: { cu: 99, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 } },
                ]
            },
            { code: 'CU-BR', name: 'Bakar Berry (II)', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 96, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Berry standard', condition: 'Polovan', minPurity: 96.0, buyPrice: 11.88 },
                    { grade: 'Berry oksidiran', condition: 'Polovan/Oksidiran', minPurity: 92.0, buyPrice: 10.50 },
                    { grade: 'Berry lakiran', condition: 'Polovan/Lakiran', minPurity: 90.0, buyPrice: 9.80 },
                ]
            },
            { code: 'CU-INS', name: 'Bakar Izolirani (Kablovi)', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 65, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Kablovi debeli (>4mm)', condition: 'Polovan', minPurity: 65.0, buyPrice: 8.10 },
                    { grade: 'Kablovi tanki (<4mm)', condition: 'Polovan', minPurity: 40.0, buyPrice: 5.40 },
                    { grade: 'Telekomunikacioni', condition: 'Polovan', minPurity: 30.0, buyPrice: 4.05 },
                ]
            },
            { code: 'AL-PRF', name: 'Aluminij Profil', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 0, al: 98, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Profil čist (nefarban)', condition: 'Nov', minPurity: 98.0, buyPrice: 3.20 },
                    { grade: 'Profil farban', condition: 'Polovan', minPurity: 95.0, buyPrice: 2.94 },
                    { grade: 'Profil prljav', condition: 'Polovan/Prljav', minPurity: 85.0, buyPrice: 2.40 },
                ]
            },
            { code: 'AL-CST', name: 'Aluminij Liveni (Cast)', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 0, al: 90, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Liveni čist', condition: 'Polovan', minPurity: 90.0, buyPrice: 2.10 },
                    { grade: 'Liveni sa željezom', condition: 'Polovan/Mješan', minPurity: 75.0, buyPrice: 1.60 },
                ]
            },
            { code: 'AL-LIM', name: 'Aluminij Lim/Folija', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 0, al: 95, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Lim čist', condition: 'Polovan', minPurity: 95.0, buyPrice: 1.80 },
                    { grade: 'Folija (offset)', condition: 'Polovan', minPurity: 80.0, buyPrice: 1.20 },
                ]
            },
            { code: 'BRASS', name: 'Mesing (Cu/Zn)', baseUnit: 'KG', lmeLinked: true, category: 'OBOJENI METALI', chemicalData: { cu: 60, al: 0, fe: 0, zn: 40, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Mesing žut', condition: 'Polovan', minPurity: 60.0, buyPrice: 5.78 },
                    { grade: 'Mesing crven', condition: 'Polovan', minPurity: 80.0, buyPrice: 6.50 },
                ]
            },
            { code: 'INOX', name: 'Nerđajući Čelik (Inox)', baseUnit: 'KG', lmeLinked: false, category: 'OBOJENI METALI', chemicalData: { cu: 0, al: 0, fe: 70, zn: 0, pb: 0, ni: 10 },
                variants: [
                    { grade: 'Inox 304', condition: 'Polovan', minPurity: 0, buyPrice: 2.20 },
                    { grade: 'Inox 316', condition: 'Polovan', minPurity: 0, buyPrice: 3.00 },
                    { grade: 'Inox mješani', condition: 'Polovan', minPurity: 0, buyPrice: 1.80 },
                ]
            },
            { code: 'ZORBA', name: 'Zorba Mix (Post-šreder)', baseUnit: 'KG', lmeLinked: false, category: 'OBOJENI METALI', chemicalData: { cu: 5, al: 50, fe: 40, zn: 3, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Zorba standard', condition: 'Prerađen', minPurity: 0, buyPrice: 1.50 },
                ]
            },
        ]
    },
    {
        category: 'CRNI METALI (ŽELJEZO)',
        items: [
            { code: 'FE-E3', name: 'Teški Čelik (HMS/E3)', baseUnit: 'KG', lmeLinked: false, category: 'CRNI METALI (ŽELJEZO)', chemicalData: { cu: 0, al: 0, fe: 99, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'HMS I/II', condition: 'Polovan', minPurity: 0, buyPrice: 0.40 },
                    { grade: 'Šina', condition: 'Polovan', minPurity: 0, buyPrice: 0.42 },
                    { grade: 'Noževi/Alati', condition: 'Polovan', minPurity: 0, buyPrice: 0.38 },
                ]
            },
            { code: 'FE-E1', name: 'Miješano Željezo (E1)', baseUnit: 'KG', lmeLinked: false, category: 'CRNI METALI (ŽELJEZO)', chemicalData: { cu: 0, al: 0, fe: 95, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Miješani laki', condition: 'Polovan', minPurity: 0, buyPrice: 0.30 },
                    { grade: 'Miješani sa limom', condition: 'Polovan', minPurity: 0, buyPrice: 0.28 },
                ]
            },
            { code: 'FE-SHR', name: 'Šredirano Željezo (E40)', baseUnit: 'KG', lmeLinked: false, category: 'CRNI METALI (ŽELJEZO)', chemicalData: { cu: 0, al: 0, fe: 98, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'E40 standard', condition: 'Prerađen', minPurity: 0, buyPrice: 0.38 },
                ]
            },
            { code: 'FE-TRN', name: 'Limeni Povrat (Turnings)', baseUnit: 'KG', lmeLinked: false, category: 'CRNI METALI (ŽELJEZO)', chemicalData: { cu: 0, al: 0, fe: 98, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Strugotina čelična', condition: 'Industrijski', minPurity: 0, buyPrice: 0.22 },
                    { grade: 'Strugotina livena', condition: 'Industrijski', minPurity: 0, buyPrice: 0.18 },
                ]
            },
        ]
    },
    {
        category: 'SPECIJALNI & OPASNI',
        items: [
            { code: 'BAT-PB', name: 'Akumulatori (Olovo)', baseUnit: 'KG', lmeLinked: false, category: 'SPECIJALNI & OPASNI', chemicalData: { cu: 0, al: 0, fe: 0, zn: 0, pb: 60, ni: 0 },
                variants: [
                    { grade: 'Akumulator cio', condition: 'Polovan', minPurity: 0, buyPrice: 0.55 },
                    { grade: 'Olovo čisto', condition: 'Polovan', minPurity: 0, buyPrice: 1.20 },
                ]
            },
            { code: 'CAT', name: 'Katalizatori', baseUnit: 'KOM', lmeLinked: false, category: 'SPECIJALNI & OPASNI', chemicalData: { cu: 0, al: 0, fe: 0, zn: 0, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Keramički (benzin)', condition: 'Polovan', minPurity: 0, buyPrice: 0 },
                    { grade: 'Metalik (diesel)', condition: 'Polovan', minPurity: 0, buyPrice: 0 },
                    { grade: 'DPF Filter', condition: 'Polovan', minPurity: 0, buyPrice: 0 },
                ]
            },
            { code: 'ELV', name: 'Otpadno Vozilo (Auto)', baseUnit: 'KOM', lmeLinked: false, category: 'SPECIJALNI & OPASNI', chemicalData: { cu: 2, al: 8, fe: 70, zn: 1, pb: 0, ni: 0 },
                variants: [
                    { grade: 'Kompletan (sa motorom)', condition: 'Za depoluciju', minPurity: 0, buyPrice: 0.40 },
                    { grade: 'Školjka (bez motora)', condition: 'Za depoluciju', minPurity: 0, buyPrice: 0.30 },
                    { grade: 'Prešan kocka', condition: 'Prerađen', minPurity: 0, buyPrice: 0.25 },
                ]
            },
        ]
    },
];

// Flat list for MaterialPicker search
export const allMaterialsFlat = materialCategories.flatMap(c => c.items);
