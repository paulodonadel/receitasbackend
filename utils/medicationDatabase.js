/**
 * Base de dados de medicamentos com princípios ativos
 * Inclui variações de escrita e nomes comerciais
 */

const medicationDatabase = {
  // Estimulantes / TDAH
  'lisdexanfetamina': {
    activeIngredient: 'Lisdexanfetamina',
    class: 'Estimulante',
    variations: ['venvanse', 'venvance', 'vyvanse', 'elvanse', 'lyberdia', 'lysdexa'],
    commercialNames: ['Venvanse', 'Vyvanse', 'Elvanse', 'Lyberdia', 'Lysdexa']
  },
  'metilfenidato': {
    activeIngredient: 'Metilfenidato',
    class: 'Estimulante',
    variations: ['ritalina', 'ritalin', 'concerta', 'ritrocel'],
    commercialNames: ['Ritalina', 'Concerta', 'Ritrocel']
  },
  'atomoxetina': {
    activeIngredient: 'Atomoxetina',
    class: 'NRIs',
    variations: ['atentah', 'strattera'],
    commercialNames: ['Atentah', 'Strattera']
  },

  // Antidepressivos - ISRS
  'escitalopram': {
    activeIngredient: 'Escitalopram',
    class: 'Antidepressivo ISRS',
    variations: ['exodus', 'exodos', 'reconter', 'esc', 'lexapro', 'literata'],
    commercialNames: ['Exodus', 'Reconter', 'Lexapro', 'Literata']
  },
  'fluoxetina': {
    activeIngredient: 'Fluoxetina',
    class: 'Antidepressivo ISRS',
    variations: ['prozac', 'daforin', 'fluxene', 'verotina', 'eufor'],
    commercialNames: ['Prozac', 'Daforin', 'Fluxene', 'Verotina', 'Eufor']
  },
  'sertralina': {
    activeIngredient: 'Sertralina',
    class: 'Antidepressivo ISRS',
    variations: ['zoloft', 'tolrest', 'serenata', 'assert', 'sercerin', 'novativ'],
    commercialNames: ['Zoloft', 'Tolrest', 'Serenata', 'Assert', 'Sercerin', 'Novativ']
  },
  'paroxetina': {
    activeIngredient: 'Paroxetina',
    class: 'Antidepressivo ISRS',
    variations: ['paxil', 'aropax', 'cebrilin', 'pexeva'],
    commercialNames: ['Paxil', 'Aropax', 'Cebrilin', 'Pexeva']
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
    variations: ['efexor', 'venlift', 'alenthus', 'velanfaxina', 'vencax'],
    commercialNames: ['Efexor', 'Venlift', 'Alenthus', 'Vencax']
  },
  'desvenlafaxina': {
    activeIngredient: 'Desvenlafaxina',
    class: 'Antidepressivo IRSN',
    // NOTA: "Pondera" estava mapeado como Paroxetina no banco anterior - corrigido
    // aqui para Desvenlafaxina (marca da Zydus/EMS). Por favor confirme.
    variations: ['pondera', 'desduo', 'pristiq'],
    commercialNames: ['Pondera', 'Pondera XR', 'Desduo', 'Pristiq']
  },
  'duloxetina': {
    activeIngredient: 'Duloxetina',
    class: 'Antidepressivo IRSN',
    variations: ['cymbalta', 'velija', 'xevalin'],
    commercialNames: ['Cymbalta', 'Velija', 'Xevalin']
  },

  // Antidepressivos - Tricíclicos
  'amitriptilina': {
    activeIngredient: 'Amitriptilina',
    class: 'Antidepressivo Tricíclico',
    variations: ['tryptanol', 'amytril', 'neurotrip'],
    commercialNames: ['Tryptanol', 'Amytril']
  },
  'nortriptilina': {
    activeIngredient: 'Nortriptilina',
    class: 'Antidepressivo Tricíclico',
    variations: ['pamelor'],
    commercialNames: ['Pamelor']
  },
  'clomipramina': {
    activeIngredient: 'Clomipramina',
    class: 'Antidepressivo Tricíclico',
    variations: ['anafranil'],
    commercialNames: ['Anafranil']
  },
  'imipramina': {
    activeIngredient: 'Imipramina',
    class: 'Antidepressivo Tricíclico',
    variations: ['tofranil'],
    commercialNames: ['Tofranil']
  },
  'maprotilina': {
    activeIngredient: 'Maprotilina',
    class: 'Antidepressivo Tetracíclico',
    variations: ['ludiomil'],
    commercialNames: ['Ludiomil']
  },

  // Antidepressivos - IMAO
  'moclobemida': {
    activeIngredient: 'Moclobemida',
    class: 'Antidepressivo IMAO',
    variations: ['aurorix'],
    commercialNames: ['Aurorix']
  },
  'tranilcipromina': {
    activeIngredient: 'Tranilcipromina',
    class: 'Antidepressivo IMAO',
    variations: ['parnate'],
    commercialNames: ['Parnate']
  },

  // Antidepressivos - outras classes
  'bupropiona': {
    activeIngredient: 'Bupropiona',
    class: 'Antidepressivo NDRI',
    variations: ['wellbutrin', 'zetron'],
    commercialNames: ['Wellbutrin', 'Zetron']
  },
  'tianeptina': {
    activeIngredient: 'Tianeptina',
    class: 'Antidepressivo Atípico',
    variations: ['stablon'],
    commercialNames: ['Stablon']
  },
  'mirtazapina': {
    activeIngredient: 'Mirtazapina',
    class: 'Antidepressivo NaSSA',
    variations: ['remeron'],
    commercialNames: ['Remeron']
  },
  'vortioxetina': {
    activeIngredient: 'Vortioxetina',
    class: 'Antidepressivo Multimodal',
    variations: ['voextor', 'brintellix', 'trintellix'],
    commercialNames: ['Brintellix', 'Voextor']
  },
  'vilazodona': {
    activeIngredient: 'Vilazodona',
    class: 'SPARI',
    variations: ['aymee'],
    commercialNames: ['Aymee']
  },
  'agomelatina': {
    activeIngredient: 'Agomelatina',
    class: 'Antidepressivo Melatoninérgico',
    variations: ['valdoxan', 'melitor'],
    commercialNames: ['Valdoxan']
  },
  'trazodona': {
    activeIngredient: 'Trazodona',
    class: 'Antagonista e inibidor da recaptação da serotonina - SARI',
    variations: ['donaren'],
    commercialNames: ['Donaren']
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
  'bromazepam': {
    activeIngredient: 'Bromazepam',
    class: 'Benzodiazepínico',
    variations: ['lexotan', 'somalium', 'norzepam'],
    commercialNames: ['Lexotan', 'Somalium', 'Norzepam']
  },
  'clobazam': {
    activeIngredient: 'Clobazam',
    class: 'Benzodiazepínico',
    variations: ['frisium', 'urbanil'],
    commercialNames: ['Frisium', 'Urbanil']
  },
  'cloxazolam': {
    activeIngredient: 'Cloxazolam',
    class: 'Benzodiazepínico',
    variations: ['olcadil'],
    commercialNames: ['Olcadil']
  },
  'midazolam': {
    activeIngredient: 'Midazolam',
    class: 'Benzodiazepínico',
    variations: ['dormonid'],
    commercialNames: ['Dormonid']
  },

  // Ansiolíticos - outras classes
  'buspirona': {
    activeIngredient: 'Buspirona',
    class: 'Ansiolítico (Azapirona)',
    variations: ['ansitec', 'buspar'],
    commercialNames: ['Ansitec']
  },

  // Antipsicóticos - Típicos
  'haloperidol': {
    activeIngredient: 'Haloperidol',
    class: 'Antipsicótico Típico',
    variations: ['haldol'],
    commercialNames: ['Haldol']
  },
  'clorpromazina': {
    activeIngredient: 'Clorpromazina',
    class: 'Antipsicótico Típico',
    variations: ['amplictil'],
    commercialNames: ['Amplictil']
  },
  'levomepromazina': {
    activeIngredient: 'Levomepromazina',
    class: 'Antipsicótico Típico',
    variations: ['neozine'],
    commercialNames: ['Neozine']
  },
  'periciazina': {
    activeIngredient: 'Periciazina',
    class: 'Antipsicótico Típico',
    variations: ['neuleptil'],
    commercialNames: ['Neuleptil']
  },
  'pimozida': {
    activeIngredient: 'Pimozida',
    class: 'Antipsicótico Típico',
    variations: ['orap'],
    commercialNames: ['Orap']
  },
  'zuclopentixol': {
    activeIngredient: 'Zuclopentixol',
    class: 'Antipsicótico Típico',
    variations: ['clopixol'],
    commercialNames: ['Clopixol']
  },

  // Antipsicóticos - Atípicos
  'quetiapina': {
    activeIngredient: 'Quetiapina',
    class: 'Antipsicótico Atípico',
    variations: ['seroquel', 'quetidin', 'zargus'],
    commercialNames: ['Seroquel', 'Quetidin', 'Zargus']
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
  'ziprasidona': {
    activeIngredient: 'Ziprasidona',
    class: 'Antipsicótico Atípico',
    variations: ['geodon', 'zipsydon'],
    commercialNames: ['Geodon', 'Zipsydon']
  },
  'clozapina': {
    activeIngredient: 'Clozapina',
    class: 'Antipsicótico Atípico',
    variations: ['leponex'],
    commercialNames: ['Leponex']
  },
  'paliperidona': {
    activeIngredient: 'Paliperidona',
    class: 'Antipsicótico Atípico',
    variations: ['invega'],
    commercialNames: ['Invega']
  },
  'lurasidona': {
    activeIngredient: 'Lurasidona',
    class: 'Antipsicótico Atípico',
    variations: ['latuda'],
    commercialNames: ['Latuda']
  },
  'cariprazina': {
    activeIngredient: 'Cariprazina',
    class: 'Antipsicótico Atípico',
    variations: ['vraylar'],
    commercialNames: ['Vraylar']
  },

  // Estabilizadores de humor / anticonvulsivantes
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
  'topiramato': {
    activeIngredient: 'Topiramato',
    class: 'Anticonvulsivante / Estabilizador de Humor',
    variations: ['topamax'],
    commercialNames: ['Topamax']
  },
  'carbamazepina': {
    activeIngredient: 'Carbamazepina',
    class: 'Anticonvulsivante / Estabilizador de Humor',
    variations: ['tegretol'],
    commercialNames: ['Tegretol']
  },
  'oxcarbazepina': {
    activeIngredient: 'Oxcarbazepina',
    class: 'Anticonvulsivante / Estabilizador de Humor',
    variations: ['trileptal'],
    commercialNames: ['Trileptal']
  },
  'lamotrigina': {
    activeIngredient: 'Lamotrigina',
    class: 'Anticonvulsivante / Estabilizador de Humor',
    variations: ['lamictal', 'neurin'],
    commercialNames: ['Lamictal', 'Neurin']
  },

  // Hipnóticos / Indutores de sono
  'zolpidem': {
    activeIngredient: 'Zolpidem',
    class: 'Hipnótico',
    variations: ['stilnox', 'lioram', 'patz'],
    commercialNames: ['Stilnox', 'Lioram', 'Patz']
  },
  'zopiclona': {
    activeIngredient: 'Zopiclona',
    class: 'Hipnótico',
    variations: ['imovane'],
    commercialNames: ['Imovane']
  },
  'eszopiclona': {
    activeIngredient: 'Eszopiclona',
    class: 'Hipnótico',
    variations: ['lunesta'],
    commercialNames: ['Lunesta']
  },

  // Dependência química
  'naltrexona': {
    activeIngredient: 'Naltrexona',
    class: 'Antagonista Opioide',
    variations: ['revia'],
    commercialNames: ['Revia']
  },
  'dissulfiram': {
    activeIngredient: 'Dissulfiram',
    class: 'Antagonista Opioide / Aversivo ao Álcool',
    variations: ['antietanol'],
    commercialNames: ['Antietanol']
  },
  'acamprosato': {
    activeIngredient: 'Acamprosato',
    class: 'Antagonista Opioide / Aversivo ao Álcool',
    variations: ['campral'],
    commercialNames: ['Campral']
  },

  // Sexologia / hormônios (linha de atuação da clínica)
  'testosterona': {
    activeIngredient: 'Testosterona',
    class: 'Reposição Hormonal',
    variations: ['durateston', 'deposteron', 'nebido', 'androgel'],
    commercialNames: ['Durateston', 'Deposteron', 'Nebido', 'Androgel']
  },
  'tadalafila': {
    activeIngredient: 'Tadalafila',
    class: 'Inibidor da PDE5',
    variations: ['cialis'],
    commercialNames: ['Cialis']
  },
  'sildenafila': {
    activeIngredient: 'Sildenafila',
    class: 'Inibidor da PDE5',
    variations: ['viagra'],
    commercialNames: ['Viagra']
  },
  'vardenafila': {
    activeIngredient: 'Vardenafila',
    class: 'Inibidor da PDE5',
    variations: ['levitra'],
    commercialNames: ['Levitra']
  }
};

// Palavras que aparecem junto ao nome do medicamento mas não ajudam a
// identificá-lo (preposições, forma farmacêutica, liberação prolongada etc.)
const STOPWORDS = new Set([
  'de', 'do', 'da', 'para', 'com', 'e',
  'xr', 'cr', 'sr', 'er', 'lp', 'rp', 'od', 'oros', 'ret', 'retard',
  'gotas', 'gota', 'comprimido', 'comprimidos', 'capsula', 'capsulas', 'cp'
]);

/**
 * Normaliza o nome de um medicamento removendo acentos,
 * convertendo para minúsculas, removendo dosagens, forma farmacêutica
 * e palavras de preenchimento (de/do/xr/etc), para permitir comparação.
 */
function normalizeMedicationName(name) {
  if (!name || typeof name !== 'string') return '';

  let normalized = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // Remove acentos

  normalized = normalized
    // Remove dosagens com unidade (ex: 20mg, 100mg, 1.5g, 500ml, 20 gotas, etc).
    // Unidades mais específicas vêm antes das mais curtas (ex: "gotas" antes de
    // "g") para que "20 gotas" não seja cortado como "20 g" + resto "otas".
    .replace(/\d+(\.\d+)?\s*(mcg|ug|µg|ui|iu|mg|ml|comprimidos?|capsulas?|gotas|cp|g|u|%)\b/gi, '')
    // Remove números "soltos" que sobraram (dosagem sem unidade explícita, ex: "Loredon 50")
    .replace(/\b\d+(\.\d+)?\b/g, '')
    .replace(/[^a-z0-9\s]/g, '') // Remove caracteres especiais
    .replace(/\s+/g, ' ')
    .trim();

  normalized = normalized
    .split(' ')
    .filter(w => w.length > 0 && !STOPWORDS.has(w))
    .join(' ')
    .trim();

  return normalized;
}

/**
 * Procura uma correspondência EXATA (após normalização) de uma única
 * palavra/trecho contra as chaves e variações do catálogo fixo.
 */
function findExactCatalogMatch(normalizedTerm) {
  if (!normalizedTerm) return null;
  for (const [key, data] of Object.entries(medicationDatabase)) {
    if (normalizeMedicationName(key) === normalizedTerm) return data;
    for (const variation of data.variations || []) {
      if (normalizeMedicationName(variation) === normalizedTerm) return data;
    }
  }
  return null;
}

/**
 * Distância de Levenshtein (número mínimo de edições para transformar a
 * string a na string b). Usada para tolerar erros de digitação.
 */
function levenshteinDistance(a, b) {
  if (a === b) return 0;
  const al = a.length, bl = b.length;
  if (al === 0) return bl;
  if (bl === 0) return al;

  let prevRow = Array.from({ length: bl + 1 }, (_, j) => j);
  for (let i = 1; i <= al; i++) {
    const currRow = [i];
    for (let j = 1; j <= bl; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1,      // remoção
        currRow[j - 1] + 1,  // inserção
        prevRow[j - 1] + cost // substituição
      );
    }
    prevRow = currRow;
  }
  return prevRow[bl];
}

/**
 * Distância máxima de edição tolerada, escalada pelo tamanho da palavra.
 * Palavras curtas toleram menos erro (para evitar falsos positivos).
 */
function maxAllowedDistance(len) {
  if (len <= 4) return 0;
  if (len <= 6) return 1;
  if (len <= 10) return 2;
  return 3;
}

/**
 * Tenta encontrar o candidato mais próximo (catálogo fixo + mapeamentos
 * customizados) tolerando erros de digitação. Exige a mesma letra inicial
 * para reduzir falsos positivos entre medicamentos não relacionados.
 */
function findFuzzyMatch(normalizedTerm, customMappingsCache) {
  if (!normalizedTerm || normalizedTerm.length < 5) return null;

  let best = null;
  let bestDistance = Infinity;

  const tryCandidate = (candidateNormalized, payload) => {
    if (!candidateNormalized || candidateNormalized[0] !== normalizedTerm[0]) return;
    const allowed = maxAllowedDistance(Math.max(normalizedTerm.length, candidateNormalized.length));
    if (allowed === 0) return;
    const distance = levenshteinDistance(normalizedTerm, candidateNormalized);
    if (distance <= allowed && distance < bestDistance) {
      bestDistance = distance;
      best = payload;
    }
  };

  for (const [key, data] of Object.entries(medicationDatabase)) {
    tryCandidate(normalizeMedicationName(key), { activeIngredient: data.activeIngredient, class: data.class });
    for (const variation of data.variations || []) {
      tryCandidate(normalizeMedicationName(variation), { activeIngredient: data.activeIngredient, class: data.class });
    }
  }

  if (customMappingsCache) {
    for (const [normKey, mapping] of customMappingsCache.entries()) {
      tryCandidate(normKey, {
        activeIngredient: mapping.activeIngredient,
        class: mapping.class,
        isMultiple: mapping.isMultiple,
        medications: mapping.medications
      });
    }
  }

  return best;
}

/**
 * Tenta quebrar um nome de medicamento composto em partes.
 * Ex: "DESDUO 100MG, DONAREN 50MG" -> ["DESDUO 100MG", "DONAREN 50MG"]
 * Ex: "Venvanse de 50 mg Aripiprazol de 15 mg" -> ["Venvanse de 50 mg", "Aripiprazol de 15 mg"]
 */
function splitCompoundMedication(medicationName) {
  if (!medicationName || typeof medicationName !== 'string') return [];

  // 1. Separadores explícitos: vírgula, " e ", "+", " mais ", ";", "/"
  const separators = [',', ' e ', ' E ', '+', ' mais ', ' MAIS ', ';', '/'];
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

  // 2. Quando não há separador explícito mas há VÁRIAS menções de dosagem
  // seguidas (ex: "Venvanse de 50 mg Sincro xr 12.5mg Aripiprazol de 15 mg"),
  // considera cada trecho "nome + dosagem" como um medicamento distinto.
  // Faixas de dosagem tipo "50-100mg" são tratadas como uma única dosagem.
  const dosageToken = /\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?\s*(?:mg|mcg|ug|µg|ml|g|ui|iu)?\b/gi;

  const finalParts = [];
  for (const part of parts) {
    const matches = part.match(dosageToken);
    if (matches && matches.length > 1) {
      const marked = part.replace(dosageToken, match => match + '');
      finalParts.push(...marked.split('').map(p => p.trim()).filter(Boolean));
    } else {
      finalParts.push(part);
    }
  }

  return finalParts.filter(p => p.length > 2);
}

/**
 * Identifica o princípio ativo de um medicamento.
 * Retorna objeto com informações do medicamento ou matchType 'not_found'.
 */
function identifyActiveIngredient(medicationName, customMappingsCache = null) {
  const normalized = normalizeMedicationName(medicationName);

  // 1. PRIORIDADE: mapeamento customizado (aprendido pelo admin/secretária)
  if (customMappingsCache && customMappingsCache.has(normalized)) {
    const customMapping = customMappingsCache.get(normalized);
    return {
      input: medicationName,
      normalized,
      activeIngredient: customMapping.activeIngredient,
      class: customMapping.class,
      matchType: 'custom',
      isMultiple: customMapping.isMultiple,
      medications: customMapping.medications
    };
  }

  // 2. Correspondência exata no catálogo fixo (chave ou variação/nome comercial)
  const exact = findExactCatalogMatch(normalized);
  if (exact) {
    return {
      input: medicationName,
      normalized,
      activeIngredient: exact.activeIngredient,
      class: exact.class,
      matchType: 'active_ingredient'
    };
  }

  // 3. Tentar quebrar em partes (separadores e/ou dosagens repetidas) e
  // identificar cada parte individualmente. Diferente da versão anterior,
  // aproveita as partes identificadas mesmo que nem todas sejam reconhecidas
  // (ex: 3 de 4 medicamentos de uma string composta identificados).
  const parts = splitCompoundMedication(medicationName);
  if (parts.length > 1) {
    const identifiedParts = [];
    const unmatchedParts = [];

    for (const part of parts) {
      const partInfo = identifyActiveIngredient(part, customMappingsCache);
      if (partInfo.matchType === 'not_found') {
        unmatchedParts.push(part);
      } else if (partInfo.isMultiple && partInfo.medications) {
        identifiedParts.push(...partInfo.medications);
      } else {
        identifiedParts.push({ name: part, activeIngredient: partInfo.activeIngredient, class: partInfo.class });
      }
    }

    if (identifiedParts.length > 0) {
      return {
        input: medicationName,
        normalized,
        activeIngredient: 'Múltiplos',
        class: 'Múltiplos',
        matchType: 'auto_split',
        isMultiple: true,
        medications: identifiedParts,
        unmatchedParts
      };
    }

    // Nenhuma parte foi identificada, mas ainda vale reportar os fragmentos
    // separadamente (ex: "Unitran gotas 20, Loredon 50") em vez da string
    // composta inteira, para facilitar o cadastro individual pelo admin.
    if (unmatchedParts.length > 1) {
      return {
        input: medicationName,
        normalized,
        activeIngredient: 'Não identificado',
        class: 'Desconhecido',
        matchType: 'not_found',
        unmatchedParts
      };
    }
  }

  // 4. Correspondência aproximada (tolera erros de digitação, ex:
  // "Velanfaxina" -> "Venlafaxina")
  const fuzzy = findFuzzyMatch(normalized, customMappingsCache);
  if (fuzzy) {
    return {
      input: medicationName,
      normalized,
      activeIngredient: fuzzy.activeIngredient,
      class: fuzzy.class,
      matchType: 'fuzzy',
      isMultiple: fuzzy.isMultiple,
      medications: fuzzy.medications
    };
  }

  // 5. Várias palavras coladas sem separador nem dosagem (ex: "Ritalina
  // Revoc Zargus"): testa cada palavra isoladamente contra o catálogo.
  const words = normalized.split(' ').filter(w => w.length >= 4);
  if (words.length > 1) {
    const wordMatches = [];
    const wordMisses = [];

    for (const word of words) {
      const match = findExactCatalogMatch(word) ||
        (customMappingsCache && customMappingsCache.has(word) ? customMappingsCache.get(word) : null);
      if (match) {
        wordMatches.push({ name: word, activeIngredient: match.activeIngredient, class: match.class });
      } else {
        wordMisses.push(word);
      }
    }

    if (wordMatches.length > 0) {
      return {
        input: medicationName,
        normalized,
        activeIngredient: 'Múltiplos',
        class: 'Múltiplos',
        matchType: 'auto_split',
        isMultiple: true,
        medications: wordMatches,
        unmatchedParts: wordMisses
      };
    }
  }

  // Não encontrado
  return {
    input: medicationName,
    normalized,
    activeIngredient: 'Não identificado',
    class: 'Desconhecido',
    matchType: 'not_found'
  };
}

/**
 * Agrupa medicamentos por princípio ativo.
 * Recebe array de strings (nomes de medicamentos).
 * Retorna objeto com contagem por princípio ativo.
 * @param {Array<string>} medications - Array de nomes de medicamentos
 * @param {Map} customMappingsCache - Cache opcional de mapeamentos customizados
 */
function groupByActiveIngredient(medications, customMappingsCache = null) {
  const grouped = {};
  const unidentified = [];

  for (const med of medications) {
    const info = identifyActiveIngredient(med, customMappingsCache);

    if (info.matchType === 'not_found') {
      if (info.unmatchedParts && info.unmatchedParts.length > 1) {
        unidentified.push(...info.unmatchedParts);
      } else {
        unidentified.push(med);
      }
      continue;
    }

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
      // Partes de uma string composta que não foram identificadas continuam
      // aparecendo na lista de não identificados (em vez de perder a string toda)
      if (info.unmatchedParts && info.unmatchedParts.length > 0) {
        unidentified.push(...info.unmatchedParts);
      }
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
    unidentified
  };
}

module.exports = {
  medicationDatabase,
  normalizeMedicationName,
  identifyActiveIngredient,
  groupByActiveIngredient,
  splitCompoundMedication,
  levenshteinDistance
};
