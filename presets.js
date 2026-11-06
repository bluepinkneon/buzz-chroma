// One character recipe supplies every mode and appearance. Neutral families are
// real design choices; closely related hues need not be forced apart.
const RECIPES = Object.freeze([
  {
    "id": "blue-pink-neon",
    "hues": [
      224,
      359,
      179
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 90,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Ranveer’s original: blue, pink and neon."
  },
  {
    "id": "daredevil",
    "hues": [
      20,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "mono",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Classic crimson suit, charcoal details and silver-white highlights."
  },
  {
    "id": "spider-man",
    "hues": [
      25,
      255,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Classic red-and-blue suit with white eye lenses."
  },
  {
    "id": "black-widow",
    "hues": [
      30,
      40,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Black tactical suit, scarlet hourglass and copper-red hair."
  },
  {
    "id": "black-panther",
    "hues": [
      300,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "duo",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "T’Challa’s black suit, violet vibranium energy and silver details."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "storm",
    "hues": [
      250,
      75,
      180
    ],
    "surfaceOffset": 0,
    "defaultMode": "mono",
    "description": "Storm-cloud indigo monochrome; lightning gold and sea glass in full color.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "john-wick",
    "hues": [
      285,
      225,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Black tailoring with violet and blue Chapter 4 night lighting."
  },
  {
    "id": "miyamoto-musashi",
    "hues": [
      250,
      60,
      0
    ],
    "neutrals": [
      true,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Sumi ink, pale paper and the warm wood of Musashi’s brushwork."
  },
  {
    "id": "sherlock-holmes",
    "hues": [
      65,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "mono",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Victorian sepia, dark ink and pale paper."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "trinity",
    "hues": [
      170,
      285,
      75
    ],
    "surfaceOffset": 0,
    "defaultMode": "mono",
    "description": "Jade monochrome; ultraviolet and gold in full color.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "neo",
    "hues": [
      145,
      0,
      145
    ],
    "neutrals": [
      false,
      true,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "mono",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Matrix phosphor green, black leather and green code."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "aragorn",
    "hues": [
      155,
      345,
      250
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Ranger green, worn burgundy and steel blue.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "lara-croft",
    "hues": [
      190,
      60,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "auto",
    "defaultNeutral": false,
    "description": "Classic teal top, brown leather and neutral stone."
  },
  {
    "id": "wonder-woman",
    "hues": [
      25,
      85,
      255
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Classic crimson armor, royal blue and golden insignia."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "katniss-everdeen",
    "hues": [
      95,
      25,
      240
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Mockingjay gold, ember and cold silver-blue.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "princess-leia",
    "hues": [
      0,
      0,
      0
    ],
    "neutrals": [
      true,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "mono",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "A New Hope’s white gown and silver belt, without invented accents."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "ripley",
    "hues": [
      210,
      75,
      285
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Industrial teal, warning amber and deep violet.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "geralt-of-rivia",
    "hues": [
      220,
      25,
      85
    ],
    "surfaceOffset": 0,
    "defaultMode": "mono",
    "description": "Steel-blue monochrome; crimson and gold in full color.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "wolverine",
    "hues": [
      95,
      255,
      25
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Classic battle yellow, cobalt blue and the red X-Men belt."
  },
  {
    "id": "batman",
    "hues": [
      95,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "duo",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Charcoal Batsuit with the golden Bat-Signal."
  },
  {
    "id": "superman",
    "hues": [
      250,
      30,
      90
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Classic blue suit, red cape and yellow S shield."
  },
  {
    "id": "harley-quinn",
    "hues": [
      350,
      235,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Modern pink-and-blue hair, pale makeup and black stagewear."
  },
  {
    "id": "deadpool",
    "hues": [
      25,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Red suit panels, black tactical gear and white eye lenses."
  },
  {
    "id": "joker",
    "hues": [
      300,
      145,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Classic purple suit, green hair and chalk-white face paint."
  },
  {
    "id": "doctor-strange",
    "hues": [
      255,
      25,
      95
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Blue tunic, red Cloak of Levitation and the golden Eye of Agamotto."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "ahsoka-tano",
    "hues": [
      56,
      200,
      270
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Warm copper, saber cyan and indigo.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "obi-wan-kenobi",
    "hues": [
      55,
      230,
      150
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Desert ochre, saber blue and sage.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "darth-vader",
    "hues": [
      22,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Black armor, red lightsaber and silver helmet highlights."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "frodo-baggins",
    "hues": [
      125,
      55,
      250
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Shire-leaf green, weathered leather and twilight blue.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "gandalf",
    "hues": [
      0,
      65,
      0
    ],
    "neutrals": [
      true,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Gandalf the Grey’s wool robes, wooden staff and silver hair."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "legolas",
    "hues": [
      145,
      65,
      230
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Woodland green, pale gold and clear blue.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "id": "hermione-granger",
    "hues": [
      25,
      85,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Black Hogwarts robes with Gryffindor scarlet and gold."
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "howl",
    "hues": [
      285,
      345,
      85
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Enchanted violet, rose and starlight gold.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "san",
    "hues": [
      25,
      150,
      255
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "War-paint red, deep forest and cold sky.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "motoko-kusanagi",
    "hues": [
      315,
      180,
      75
    ],
    "surfaceOffset": 0,
    "defaultMode": "color",
    "description": "Cybernetic orchid, neon teal and amber.",
    "neutrals": [
      false,
      false,
      false
    ]
  },
  {
    "defaultNeutral": false,
    "neutralGround": false,
    "id": "totoro",
    "hues": [
      250,
      145,
      75
    ],
    "surfaceOffset": 0,
    "defaultMode": "duo",
    "description": "Soft gray and forest green, with a matching reading-ink tint.",
    "neutrals": [
      true,
      false,
      true
    ]
  },
  {
    "id": "chun-li",
    "hues": [
      255,
      85,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Classic blue qipao, gold trim and white boots."
  },
  {
    "id": "link",
    "hues": [
      140,
      65,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Classic green tunic, brown leather boots and a white undershirt."
  },
  {
    "id": "zelda",
    "hues": [
      350,
      85,
      0
    ],
    "neutrals": [
      false,
      false,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "color",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "The Wind Waker’s pink-and-white royal dress with gold trim."
  },
  {
    "id": "samus-aran",
    "hues": [
      55,
      25,
      145
    ],
    "neutrals": [
      false,
      false,
      false
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Classic Varia armor: orange body, red helmet and green visor."
  },
  {
    "id": "sekiro",
    "hues": [
      45,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": false,
    "defaultMode": "color",
    "defaultAppearance": "dark",
    "defaultNeutral": false,
    "description": "Wolf’s weathered rust coat, charcoal wrappings and steel blade."
  },
  {
    "id": "ezio-auditore",
    "hues": [
      27,
      0,
      0
    ],
    "neutrals": [
      false,
      true,
      true
    ],
    "surfaceOffset": 0,
    "neutralGround": true,
    "defaultMode": "duo",
    "defaultAppearance": "light",
    "defaultNeutral": false,
    "description": "Brotherhood’s white robes, silver armor and crimson sash."
  }
].map(preset=>Object.freeze({defaultNeutral:false,neutralGround:false,...preset,hues:Object.freeze(preset.hues),neutrals:Object.freeze(preset.neutrals??[false,false,false])})));

// Retired recipes remain callable for existing consumers and snapshots, but are
// not advertised in the picker or listPresets(). Stored colors are never reset.
const VISIBLE_IDS = new Set(["blue-pink-neon","daredevil","spider-man","black-widow","black-panther","john-wick","miyamoto-musashi","sherlock-holmes","neo","lara-croft","wonder-woman","princess-leia","wolverine","batman","superman","harley-quinn","deadpool","joker","doctor-strange","darth-vader","gandalf","hermione-granger","chun-li","link","zelda","samus-aran","sekiro","ezio-auditore"]);
export const PRESETS = Object.freeze(RECIPES.filter(preset=>VISIBLE_IDS.has(preset.id)));
export const getPreset = id => RECIPES.find(preset=>preset.id===id)??null;

export function findPreset(choice) {
  if(choice.rotation!==0)return null;
  return RECIPES.find(preset=>preset.surfaceOffset===(choice.surfaceOffset??90)
    &&preset.neutralGround===(choice.neutralGround??false)
    &&choice.neutrals.every((neutral,index)=>neutral===preset.neutrals[index])
    &&preset.hues.every((hue,index)=>hue===choice.hues[index]))??null;
}

export function applyPreset(choice,id) {
  const preset=getPreset(id);
  if(!preset)throw new TypeError("Unknown preset");
  return {...choice,theme:"bluepinkneon",hues:[...preset.hues],rotation:0,mode:preset.defaultMode,
    neutrals:[...preset.neutrals],monoHue:null,neutral:preset.defaultNeutral,surfaceOffset:preset.surfaceOffset,neutralGround:preset.neutralGround,appearance:preset.defaultAppearance??choice.appearance,localName:null};
}
