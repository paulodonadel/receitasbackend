/**
 * Base de dados de medicamentos com princípios ativos
 * Inclui variações de escrita e nomes comerciais
 */

const medicationDatabase = {
  // Estimulantes / TDAH
  'lisdexanfetamina': {
    activeIngredient: 'Lisdexanfetamina',
    class: 'Estimulante',
    variations: ['venvanse', 'venvance', 'vyvanse', 'elvanse'],
    commercialNames: ['Venvanse', 'Vyvanse', 'Elvanse']
  },
  'metilfenidato': {
    activeIngredient: 'Metilfenidato',
    class: 'Estimulante',
    variations: ['ritalina', 'ritalin', 'concerta', 'ritrocel'],
    commercialNames: ['Ritalina', 'Concerta', 'Ritrocel']
  },
  
  // Antidepressivos - ISRS
  'escitalopram': {
    activeIngredient: 'Escitalopram',
    class: 'Antidepressivo ISRS',
    variations: ['exodus', 'exodos', 'reconter', 'esc', 'lexapro'],
    commercialNames: ['Exodus', 'Reconter', 'Lexapro']
  },
  'fluoxetina': {
    activeIngredient: 'Fluoxetina',
    class: 'Antidepressivo ISRS',
    variations: ['prozac', 'daforin', 'fluxene'],
    commercialNames: ['Prozac', 'Daforin', 'Fluxene']
  },
  'sertralina': {
    activeIngredient: 'Sertralina',
    class: 'Antidepressivo ISRS',
    variations: ['zoloft', 'tolrest', 'serenata'],
    commercialNames: ['Zoloft', 'Tolrest', 'Serenata']
  },
  'paroxetina': {
    activeIngredient: 'Paroxetina',
    class: 'Antidepressivo ISRS',
    variations: ['paxil', 'pondera', 'aropax'],
    commercialNames: ['Paxil', 'Pondera', 'Aropax']
  },
  'citalopram': {
    activeIngredient: 'Citalopram',
    class: 'Antidepressivo ISRS',
    variations: ['cipramil', 'procimax'],
    commercialNames: ['Cipramil', 'Procimax']
  },
  
  // Antidepressivos - IRSN
  'venlafaxina': {
    activeIngredient: 'Venlafaxina',
    class: 'Antidepressivo IRSN',
    variations: ['efexor', 'venlift', 'alenthus'],
    commercialNames: ['Efexor', 'Venlift', 'Alenthus']
  },
  'duloxetina': {
    activeIngredient: 'Duloxetina',
    class: 'Antidepressivo IRSN',
    variations: ['cymbalta', 'velija'],
    commercialNames: ['Cymbalta', 'Velija']
  },
  
  // Ansiolíticos - Benzodiazepínicos
  'clonazepam': {
    activeIngredient: 'Clonazepam',
    class: 'Benzodiazepínico',
    variations: ['rivotril', 'clonotril'],
    commercialNames: ['Rivotril', 'Clonotril']
  },
  'alprazolam': {
    activeIngredient: 'Alprazolam',
    class: 'Benzodiazepínico',
    variations: ['frontal', 'apraz'],
    commercialNames: ['Frontal', 'Apraz']
  },
  'diazepam': {
    activeIngredient: 'Diazepam',
    class: 'Benzodiazepínico',
    variations: ['valium', 'dienpax'],
    commercialNames: ['Valium', 'Dienpax']
  },
  'lorazepam': {
    activeIngredient: 'Lorazepam',
    class: 'Benzodiazepínico',
    variations: ['lorax', 'ativan'],
    commercialNames: ['Lorax', 'Ativan']
  },
  
  // Antipsicóticos
  'quetiapina': {
    activeIngredient: 'Quetiapina',
    class: 'Antipsicótico Atípico',
    variations: ['seroquel', 'quetidin'],
    commercialNames: ['Seroquel', 'Quetidin']
  },
  'risperidona': {
    activeIngredient: 'Risperidona',
    class: 'Antipsicótico Atípico',
    variations: ['risperdal', 'risperidon'],
    commercialNames: ['Risperdal', 'Risperidon']
  },
  'olanzapina': {
    activeIngredient: 'Olanzapina',
    class: 'Antipsicótico Atípico',
    variations: ['zyprexa'],
    commercialNames: ['Zyprexa']
  },
  'aripiprazol': {
    activeIngredient: 'Aripiprazol',
    class: 'Antipsicótico Atípico',
    variations: ['abilify', 'aristab'],
    commercialNames: ['Abilify', 'Aristab']
  },
  
  // Estabilizadores de humor
  'carbonato de lítio': {
    activeIngredient: 'Lítio',
    class: 'Estabilizador de Humor',
    variations: ['litio', 'carbolitium'],
    commercialNames: ['Carbolitium']
  },
  'valproato': {
    activeIngredient: 'Ácido Valproico',
    class: 'Estabilizador de Humor',
    variations: ['depakote', 'depakene', 'valproato de sodio'],
    commercialNames: ['Depakote', 'Depakene']
  },
  
  // Hipnóticos / Indutores de sono
  'zolpidem': {
    activeIngredient: 'Zolpidem',
    class: 'Hipnótico',
    variations: ['stilnox', 'lioram'],
    commercialNames: ['Stilnox', 'Lioram']
  },
  'zopiclona': {
    activeIngredient: 'Zopiclona',
    class: 'Hipnótico',
    variations: ['imovane'],
    commercialNames: ['Imovane']
  }
};

/**
 * Normaliza o nome de um medicamento removendo acentos, 
 * convertendo para minúsculas e removendo caracteres especiais
 */
function normalizeMedicationName(name) {
  if (!name || typeof name !== 'string') return '';
  
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .trim();
}

/**
 * Tenta quebrar um nome de medicamento composto em partes
 * Ex: "DESDUO 100MG, DONAREN 50MG" -> ["DESDUO 100MG", "DONAREN 50MG"]
 */
function splitCompoundMedication(medicationName) {
  // Separadores comuns: vírgula, " e ", " E ", "+"
  const separators = [',', ' e ', ' E ', '+', ' mais ', ' MAIS '];
  let parts = [medicationName];
  
  for (const sep of separators) {
    const newParts = [];
    for (const part of parts) {
      if (part.includes(sep)) {
        newParts.push(...part.split(sep).map(p => p.trim()).filter(p => p.length > 0));
      } else {
        newParts.push(part);
      }
    }
    parts = newParts;
  }
  
  return parts.filter(p => p.length > 2); // Filtrar partes muito curtas
}

/**
 * Identifica o princípio ativo de um medicamento
 * Retorna objeto com informações do medicamento ou null se não encontrado
 * NOTA: Esta função pode ser async quando chamada com customMappingsCache
 */
function identifyActiveIngredient(medicationName, customMappingsCache = null) {
  const normalized = normalizeMedicationName(medicationName);
  
  // 1. PRIORIDADE: Buscar em mapeamentos customizados (se fornecido)
  if (customMappingsCache && customMappingsCache.has(normalized)) {
    const customMapping = customMappingsCache.get(normalized);
    return {
      input: medicationName,
      normalized: normalized,
      activeIngredient: customMapping.activeIngredient,
      class: customMapping.class,
      matchType: 'custom',
      isMultiple: customMapping.isMultiple,
      medications: customMapping.medications
    };
  }
  
  // 2. Buscar correspondência exata com princípio ativo no banco padrão
  for (const [key, data] of Object.entries(medicationDatabase)) {
    if (normalizeMedicationName(key) === normalized) {
      return {
        input: medicationName,
        normalized: key,
        activeIngredient: data.activeIngredient,
        class: data.class,
        matchType: 'active_ingredient'
      };
    }
  }
  
  // 3. Buscar correspondência nas variações/nomes comerciais
  for (const [key, data] of Object.entries(medicationDatabase)) {
    const variations = data.variations || [];
    for (const variation of variations) {
      if (normalizeMedicationName(variation) === normalized) {
        return {
          input: medicationName,
          normalized: variation,
          activeIngredient: data.activeIngredient,
          class: data.class,
          matchType: 'variation'
        };
      }
    }
  }
  
  // 4. NOVO: Tentar quebrar em partes e identificar cada uma
  const parts = splitCompoundMedication(medicationName);
  if (parts.length > 1) {
    const identifiedParts = [];
    let allIdentified = true;
    
    for (const part of parts) {
      const partInfo = identifyActiveIngredient(part, customMappingsCache);
      if (partInfo.matchType === 'not_found') {
        allIdentified = false;
        break;
      }
      identifiedParts.push({
        name: part,
        activeIngredient: partInfo.activeIngredient,
        class: partInfo.class
      });
    }
    
    // Se todas as partes foram identificadas, retornar como múltiplo
    if (allIdentified && identifiedParts.length > 0) {
      return {
        input: medicationName,
        normalized: normalized,
        activeIngredient: 'Múltiplos',
        class: 'Múltiplos',
        matchType: 'auto_split',
        isMultiple: true,
        medications: identifiedParts
      };
    }
  }
  
  // Não encontrado
  return {
    input: medicationName,
    normalized: normalized,
    activeIngredient: 'Não identificado',
    class: 'Desconhecido',
    matchType: 'not_found'
  };
}

/**
 * Agrupa medicamentos por princípio ativo
 * Recebe array de strings (nomes de medicamentos)
 * Retorna objeto com contagem por princípio ativo
 * @param {Array<string>} medications - Array de nomes de medicamentos
 * @param {Map} customMappingsCache - Cache opcional de mapeamentos customizados
 */
function groupByActiveIngredient(medications, customMappingsCache = null) {
  const grouped = {};
  const unidentified = [];
  
  for (const med of medications) {
    const info = identifyActiveIngredient(med, customMappingsCache);
    
    if (info.matchType === 'not_found') {
      unidentified.push(med);
    } else {
      // Se for múltiplo, conta cada medicamento separadamente
      if (info.isMultiple && info.medications && info.medications.length > 0) {
        for (const subMed of info.medications) {
          if (!grouped[subMed.activeIngredient]) {
            grouped[subMed.activeIngredient] = {
              activeIngredient: subMed.activeIngredient,
              class: subMed.class,
              count: 0,
              variations: []
            };
          }
          grouped[subMed.activeIngredient].count++;
          if (!grouped[subMed.activeIngredient].variations.includes(subMed.name)) {
            grouped[subMed.activeIngredient].variations.push(subMed.name);
          }
        }
      } else {
        // Medicamento único
        if (!grouped[info.activeIngredient]) {
          grouped[info.activeIngredient] = {
            activeIngredient: info.activeIngredient,
            class: info.class,
            count: 0,
            variations: []
          };
        }
        grouped[info.activeIngredient].count++;
        if (!grouped[info.activeIngredient].variations.includes(info.input)) {
          grouped[info.activeIngredient].variations.push(info.input);
        }
      }
    }
  }
  
  return {
    byActiveIngredient: Object.values(grouped).sort((a, b) => b.count - a.count),
    unidentified: unidentified
  };
}

module.exports = {
  medicationDatabase,
  normalizeMedicationName,
  identifyActiveIngredient,
  groupByActiveIngredient,
  splitCompoundMedication
};
