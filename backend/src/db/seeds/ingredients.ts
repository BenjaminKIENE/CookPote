/**
 * Seed data for ingredients_reference table.
 * ~200 common French ingredients. Each entry has:
 *   - nom_canonique: canonical singular lowercase name
 *   - synonymes: JSON array of common variants
 *   - categorie: ingredient category
 */
export interface SeedIngredient {
  nom_canonique: string;
  synonymes: string[];
  categorie: 'legume' | 'fruit' | 'viande' | 'poisson' | 'laitier' | 'feculent' | 'epice' | 'condiment' | 'autre';
}

export const SEED_INGREDIENTS: SeedIngredient[] = [
  // ── Légumes ──────────────────────────────────────────────────────────────
  { nom_canonique: 'tomate', synonymes: ['tomates', 'tomate cerise', 'tomates cerises', 'tomate roma'], categorie: 'legume' },
  { nom_canonique: 'oignon', synonymes: ['oignons', 'oignon jaune', 'oignon rouge', 'oignons rouges'], categorie: 'legume' },
  { nom_canonique: 'ail', synonymes: ['gousse d\'ail', 'gousses d\'ail', 'ail en poudre'], categorie: 'legume' },
  { nom_canonique: 'carotte', synonymes: ['carottes', 'carotte râpée'], categorie: 'legume' },
  { nom_canonique: 'pomme de terre', synonymes: ['pommes de terre', 'patate', 'patates'], categorie: 'legume' },
  { nom_canonique: 'courgette', synonymes: ['courgettes', 'zucchini'], categorie: 'legume' },
  { nom_canonique: 'aubergine', synonymes: ['aubergines'], categorie: 'legume' },
  { nom_canonique: 'poivron', synonymes: ['poivrons', 'poivron rouge', 'poivron vert', 'poivron jaune'], categorie: 'legume' },
  { nom_canonique: 'poireau', synonymes: ['poireaux', 'blanc de poireau'], categorie: 'legume' },
  { nom_canonique: 'céleri', synonymes: ['céleris', 'céleri-rave', 'branche de céleri'], categorie: 'legume' },
  { nom_canonique: 'épinard', synonymes: ['épinards', 'pousses d\'épinard', 'jeunes pousses'], categorie: 'legume' },
  { nom_canonique: 'champignon', synonymes: ['champignons', 'champignon de Paris', 'champignons de Paris', 'shiitake', 'champignons shiitake'], categorie: 'legume' },
  { nom_canonique: 'haricot vert', synonymes: ['haricots verts', 'haricots plats'], categorie: 'legume' },
  { nom_canonique: 'petits pois', synonymes: ['pois', 'pois frais', 'pois surgelés'], categorie: 'legume' },
  { nom_canonique: 'brocoli', synonymes: ['brocolis', 'fleuret de brocoli'], categorie: 'legume' },
  { nom_canonique: 'chou-fleur', synonymes: ['choux-fleurs'], categorie: 'legume' },
  { nom_canonique: 'chou', synonymes: ['chou vert', 'chou blanc', 'chou rouge', 'choux'], categorie: 'legume' },
  { nom_canonique: 'salade', synonymes: ['laitue', 'salade verte', 'mâche', 'roquette', 'endive'], categorie: 'legume' },
  { nom_canonique: 'concombre', synonymes: ['concombres'], categorie: 'legume' },
  { nom_canonique: 'radis', synonymes: ['radis rose', 'radis noir'], categorie: 'legume' },
  { nom_canonique: 'betterave', synonymes: ['betteraves', 'betterave rouge', 'betterave cuite'], categorie: 'legume' },
  { nom_canonique: 'panais', synonymes: ['panais'], categorie: 'legume' },
  { nom_canonique: 'navet', synonymes: ['navets'], categorie: 'legume' },
  { nom_canonique: 'fenouil', synonymes: ['fenouils', 'bulbe de fenouil'], categorie: 'legume' },
  { nom_canonique: 'artichaut', synonymes: ['artichauts', 'fond d\'artichaut'], categorie: 'legume' },
  { nom_canonique: 'asperge', synonymes: ['asperges', 'asperge verte', 'asperge blanche'], categorie: 'legume' },

  // ── Fruits ────────────────────────────────────────────────────────────────
  { nom_canonique: 'citron', synonymes: ['citrons', 'citron jaune', 'jus de citron', 'zeste de citron'], categorie: 'fruit' },
  { nom_canonique: 'citron vert', synonymes: ['citrons verts', 'lime', 'jus de citron vert'], categorie: 'fruit' },
  { nom_canonique: 'orange', synonymes: ['oranges', 'jus d\'orange', 'zeste d\'orange'], categorie: 'fruit' },
  { nom_canonique: 'pomme', synonymes: ['pommes', 'pomme golden', 'pomme granny smith'], categorie: 'fruit' },
  { nom_canonique: 'poire', synonymes: ['poires'], categorie: 'fruit' },
  { nom_canonique: 'banane', synonymes: ['bananes'], categorie: 'fruit' },
  { nom_canonique: 'fraise', synonymes: ['fraises'], categorie: 'fruit' },
  { nom_canonique: 'framboise', synonymes: ['framboises'], categorie: 'fruit' },
  { nom_canonique: 'myrtille', synonymes: ['myrtilles', 'bleuet', 'bleuets'], categorie: 'fruit' },
  { nom_canonique: 'raisin', synonymes: ['raisins', 'raisin blanc', 'raisin noir', 'raisins secs'], categorie: 'fruit' },
  { nom_canonique: 'ananas', synonymes: ['ananas en morceaux', 'ananas en boîte'], categorie: 'fruit' },
  { nom_canonique: 'mangue', synonymes: ['mangues'], categorie: 'fruit' },
  { nom_canonique: 'avocat', synonymes: ['avocats'], categorie: 'fruit' },
  { nom_canonique: 'figue', synonymes: ['figues', 'figue séchée', 'figues séchées'], categorie: 'fruit' },
  { nom_canonique: 'abricot', synonymes: ['abricots', 'abricot séché', 'abricots secs'], categorie: 'fruit' },

  // ── Viandes ───────────────────────────────────────────────────────────────
  { nom_canonique: 'poulet', synonymes: ['blanc de poulet', 'cuisse de poulet', 'filet de poulet', 'poulet entier'], categorie: 'viande' },
  { nom_canonique: 'bœuf', synonymes: ['steak', 'bifteck', 'viande hachée', 'bœuf haché', 'rumsteck', 'entrecôte'], categorie: 'viande' },
  { nom_canonique: 'porc', synonymes: ['côte de porc', 'filet mignon de porc', 'lardons', 'bacon', 'jambon'], categorie: 'viande' },
  { nom_canonique: 'agneau', synonymes: ['gigot d\'agneau', 'côtelette d\'agneau', 'épaule d\'agneau'], categorie: 'viande' },
  { nom_canonique: 'dinde', synonymes: ['escalope de dinde', 'blanc de dinde'], categorie: 'viande' },
  { nom_canonique: 'canard', synonymes: ['magret de canard', 'confit de canard', 'filet de canard'], categorie: 'viande' },
  { nom_canonique: 'veau', synonymes: ['escalope de veau', 'côte de veau', 'osso-bucco'], categorie: 'viande' },
  { nom_canonique: 'jambon', synonymes: ['jambon blanc', 'jambon cuit', 'jambon de Paris', 'jambon cru', 'prosciutto'], categorie: 'viande' },
  { nom_canonique: 'lardons', synonymes: ['lardon', 'bacon en dés', 'poitrine fumée'], categorie: 'viande' },
  { nom_canonique: 'saucisse', synonymes: ['saucisses', 'saucisse de Toulouse', 'merguez', 'chipolata'], categorie: 'viande' },
  { nom_canonique: 'chorizo', synonymes: ['chorizos', 'chorizo fort', 'chorizo doux'], categorie: 'viande' },

  // ── Poissons & fruits de mer ───────────────────────────────────────────────
  { nom_canonique: 'saumon', synonymes: ['saumon frais', 'saumon fumé', 'pavé de saumon', 'filet de saumon'], categorie: 'poisson' },
  { nom_canonique: 'thon', synonymes: ['thon en boîte', 'thon naturel', 'thon à l\'huile', 'steak de thon'], categorie: 'poisson' },
  { nom_canonique: 'cabillaud', synonymes: ['filet de cabillaud', 'morue', 'dos de cabillaud'], categorie: 'poisson' },
  { nom_canonique: 'crevette', synonymes: ['crevettes', 'crevettes roses', 'crevettes décortiquées', 'gambas'], categorie: 'poisson' },
  { nom_canonique: 'moule', synonymes: ['moules', 'moules de bouchot'], categorie: 'poisson' },
  { nom_canonique: 'sardine', synonymes: ['sardines', 'sardines en boîte'], categorie: 'poisson' },
  { nom_canonique: 'maquereau', synonymes: ['maquereaux', 'maquereau fumé'], categorie: 'poisson' },
  { nom_canonique: 'truite', synonymes: ['truite fumée', 'filet de truite'], categorie: 'poisson' },
  { nom_canonique: 'dorade', synonymes: ['dorades', 'daurade'], categorie: 'poisson' },

  // ── Produits laitiers & œufs ──────────────────────────────────────────────
  { nom_canonique: 'œuf', synonymes: ['œufs', 'jaune d\'œuf', 'blanc d\'œuf'], categorie: 'laitier' },
  { nom_canonique: 'lait', synonymes: ['lait entier', 'lait demi-écrémé', 'lait écrémé', 'lait de vache'], categorie: 'laitier' },
  { nom_canonique: 'crème fraîche', synonymes: ['crème fraîche épaisse', 'crème liquide', 'crème entière', 'crème fleurette'], categorie: 'laitier' },
  { nom_canonique: 'beurre', synonymes: ['beurre doux', 'beurre demi-sel', 'beurre salé'], categorie: 'laitier' },
  { nom_canonique: 'fromage râpé', synonymes: ['gruyère râpé', 'emmental râpé', 'comté râpé', 'parmesan râpé'], categorie: 'laitier' },
  { nom_canonique: 'parmesan', synonymes: ['parmigiano reggiano', 'copeaux de parmesan'], categorie: 'laitier' },
  { nom_canonique: 'mozzarella', synonymes: ['mozzarella fraîche', 'boule de mozzarella'], categorie: 'laitier' },
  { nom_canonique: 'fromage de chèvre', synonymes: ['chèvre', 'crottin de chèvre', 'bûchette de chèvre'], categorie: 'laitier' },
  { nom_canonique: 'yaourt', synonymes: ['yaourts', 'yaourt nature', 'yaourt grec', 'fromage blanc'], categorie: 'laitier' },
  { nom_canonique: 'ricotta', synonymes: ['ricotta fraîche'], categorie: 'laitier' },
  { nom_canonique: 'mascarpone', synonymes: ['crème mascarpone'], categorie: 'laitier' },
  { nom_canonique: 'roquefort', synonymes: ['fromage bleu', 'gorgonzola', 'bleu d\'Auvergne'], categorie: 'laitier' },

  // ── Féculents & céréales ──────────────────────────────────────────────────
  { nom_canonique: 'farine', synonymes: ['farine de blé', 'farine T45', 'farine T55', 'farine T65'], categorie: 'feculent' },
  { nom_canonique: 'riz', synonymes: ['riz basmati', 'riz long', 'riz rond', 'riz arborio', 'riz complet'], categorie: 'feculent' },
  { nom_canonique: 'pâtes', synonymes: ['spaghetti', 'penne', 'tagliatelle', 'fusilli', 'farfalle', 'linguine', 'rigatoni'], categorie: 'feculent' },
  { nom_canonique: 'pain', synonymes: ['baguette', 'pain de campagne', 'pain de mie', 'pain rassis', 'croûtons'], categorie: 'feculent' },
  { nom_canonique: 'pomme de terre', synonymes: ['pommes de terre', 'patate', 'patates'], categorie: 'feculent' },
  { nom_canonique: 'lentille', synonymes: ['lentilles', 'lentilles vertes', 'lentilles corail', 'lentilles beluga'], categorie: 'feculent' },
  { nom_canonique: 'pois chiche', synonymes: ['pois chiches', 'chickpeas', 'pois chiches en boîte'], categorie: 'feculent' },
  { nom_canonique: 'haricot blanc', synonymes: ['haricots blancs', 'haricots cannellini', 'haricots en boîte'], categorie: 'feculent' },
  { nom_canonique: 'quinoa', synonymes: ['quinoa blanc', 'quinoa rouge'], categorie: 'feculent' },
  { nom_canonique: 'semoule', synonymes: ['semoule de blé', 'semoule fine', 'couscous'], categorie: 'feculent' },
  { nom_canonique: 'avoine', synonymes: ['flocons d\'avoine', 'porridge', 'muesli'], categorie: 'feculent' },
  { nom_canonique: 'chapelure', synonymes: ['chapelure fine', 'chapelure japonaise', 'panko'], categorie: 'feculent' },

  // ── Épices & herbes ───────────────────────────────────────────────────────
  { nom_canonique: 'sel', synonymes: ['sel fin', 'gros sel', 'fleur de sel', 'sel de mer'], categorie: 'epice' },
  { nom_canonique: 'poivre', synonymes: ['poivre noir', 'poivre blanc', 'poivre du moulin', 'poivre concassé'], categorie: 'epice' },
  { nom_canonique: 'cumin', synonymes: ['cumin en poudre', 'graines de cumin'], categorie: 'epice' },
  { nom_canonique: 'curry', synonymes: ['poudre de curry', 'curry doux', 'curry fort'], categorie: 'epice' },
  { nom_canonique: 'paprika', synonymes: ['paprika doux', 'paprika fumé', 'paprika fort'], categorie: 'epice' },
  { nom_canonique: 'curcuma', synonymes: ['curcuma en poudre', 'curcuma frais'], categorie: 'epice' },
  { nom_canonique: 'cannelle', synonymes: ['cannelle en poudre', 'bâton de cannelle'], categorie: 'epice' },
  { nom_canonique: 'herbes de Provence', synonymes: ['mélange de Provence', 'thym romarin origan'], categorie: 'epice' },
  { nom_canonique: 'thym', synonymes: ['branche de thym', 'thym frais', 'thym séché'], categorie: 'epice' },
  { nom_canonique: 'romarin', synonymes: ['branche de romarin', 'romarin frais', 'romarin séché'], categorie: 'epice' },
  { nom_canonique: 'basilic', synonymes: ['feuilles de basilic', 'basilic frais', 'basilic séché'], categorie: 'epice' },
  { nom_canonique: 'persil', synonymes: ['persil plat', 'persil frisé', 'persil frais'], categorie: 'epice' },
  { nom_canonique: 'coriandre', synonymes: ['coriandre fraîche', 'graines de coriandre', 'coriandre en poudre'], categorie: 'epice' },
  { nom_canonique: 'laurier', synonymes: ['feuille de laurier', 'feuilles de laurier'], categorie: 'epice' },
  { nom_canonique: 'origan', synonymes: ['origan séché', 'origan frais'], categorie: 'epice' },
  { nom_canonique: 'piment', synonymes: ['piment rouge', 'piment vert', 'piment d\'Espelette', 'piment fort', 'chili'], categorie: 'epice' },
  { nom_canonique: 'muscade', synonymes: ['noix de muscade', 'muscade râpée', 'muscade en poudre'], categorie: 'epice' },
  { nom_canonique: 'gingembre', synonymes: ['gingembre frais', 'gingembre en poudre', 'gingembre râpé'], categorie: 'epice' },

  // ── Condiments & sauces ───────────────────────────────────────────────────
  { nom_canonique: 'huile d\'olive', synonymes: ['huile d\'olive extra vierge', 'huile d\'olive vierge'], categorie: 'condiment' },
  { nom_canonique: 'huile', synonymes: ['huile de tournesol', 'huile végétale', 'huile de colza', 'huile de sésame'], categorie: 'condiment' },
  { nom_canonique: 'vinaigre', synonymes: ['vinaigre balsamique', 'vinaigre de vin', 'vinaigre de cidre', 'vinaigre blanc'], categorie: 'condiment' },
  { nom_canonique: 'moutarde', synonymes: ['moutarde de Dijon', 'moutarde à l\'ancienne', 'moutarde forte'], categorie: 'condiment' },
  { nom_canonique: 'sauce soja', synonymes: ['soja', 'tamari', 'sauce soia', 'soy sauce'], categorie: 'condiment' },
  { nom_canonique: 'concentré de tomate', synonymes: ['purée de tomate', 'double concentré', 'coulis de tomate'], categorie: 'condiment' },
  { nom_canonique: 'mayonnaise', synonymes: ['mayo'], categorie: 'condiment' },
  { nom_canonique: 'ketchup', synonymes: ['sauce tomate ketchup'], categorie: 'condiment' },
  { nom_canonique: 'sauce pesto', synonymes: ['pesto vert', 'pesto alla genovese', 'pesto rosso'], categorie: 'condiment' },
  { nom_canonique: 'miel', synonymes: ['miel liquide', 'miel toutes fleurs', 'miel d\'acacia'], categorie: 'condiment' },
  { nom_canonique: 'sucre', synonymes: ['sucre blanc', 'sucre en poudre', 'sucre semoule', 'sucre roux', 'cassonade'], categorie: 'condiment' },
  { nom_canonique: 'bouillon', synonymes: ['bouillon de poulet', 'bouillon de légumes', 'bouillon de bœuf', 'cube de bouillon'], categorie: 'condiment' },

  // ── Autres / divers ───────────────────────────────────────────────────────
  { nom_canonique: 'chocolat', synonymes: ['chocolat noir', 'chocolat au lait', 'chocolat blanc', 'cacao en poudre'], categorie: 'autre' },
  { nom_canonique: 'levure', synonymes: ['levure chimique', 'levure boulangère', 'bicarbonate'], categorie: 'autre' },
  { nom_canonique: 'gélatine', synonymes: ['feuilles de gélatine', 'agar-agar'], categorie: 'autre' },
  { nom_canonique: 'amande', synonymes: ['amandes effilées', 'poudre d\'amande', 'amandes entières', 'amandes concassées'], categorie: 'autre' },
  { nom_canonique: 'noix', synonymes: ['cerneaux de noix', 'noix concassées'], categorie: 'autre' },
  { nom_canonique: 'noix de cajou', synonymes: ['cajou', 'noix de cajou grillées'], categorie: 'autre' },
  { nom_canonique: 'noisette', synonymes: ['noisettes', 'poudre de noisette', 'noisettes concassées'], categorie: 'autre' },
  { nom_canonique: 'cacahuète', synonymes: ['cacahuètes', 'arachides', 'beurre de cacahuète'], categorie: 'autre' },
  { nom_canonique: 'vin blanc', synonymes: ['vin blanc sec'], categorie: 'autre' },
  { nom_canonique: 'vin rouge', synonymes: ['vin rouge sec'], categorie: 'autre' },
  { nom_canonique: 'tomates en boîte', synonymes: ['tomates concassées', 'pulpe de tomate', 'tomates pelées', 'passata'], categorie: 'autre' },
  { nom_canonique: 'lait de coco', synonymes: ['crème de coco', 'lait de coco léger'], categorie: 'autre' },
];
