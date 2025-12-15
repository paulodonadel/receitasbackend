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
 * Identifica o princípio ativo de um medicamento
 * Retorna objeto com informações do medicamento ou null se não encontrado
 */
function identifyActiveIngredient(medicationName) {
  const normalized = normalizeMedicationName(medicationName);
  
  // Buscar correspondência exata com princípio ativo
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
  
  // Buscar correspondência nas variações/nomes comerciais
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
 */
function groupByActiveIngredient(medications) {
  const grouped = {};
  const unidentified = [];
  
  for (const med of medications) {
    const info = identifyActiveIngredient(med);
    
    if (info.matchType === 'not_found') {
      unidentified.push(med);
    } else {
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
  
  return {
    byActiveIngredient: Object.values(grouped).sort((a, b) => b.count - a.count),
    unidentified: unidentified
  };
}

module.exports = {
  medicationDatabase,
  normalizeMedicationName,
  identifyActiveIngredient,
  groupByActiveIngredient
};
