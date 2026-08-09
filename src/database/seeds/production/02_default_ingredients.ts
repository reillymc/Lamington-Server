import type { Knex } from "knex";

interface Ingredient {
    ingredientId: string;
    name: string;
    namePlural?: string;
    description?: string;
}

export const SYSTEM_INGREDIENTS: Array<Ingredient> = [
    {
        ingredientId: "7929848f-2494-4a95-a1df-1280eddb7d02",
        name: "Danish feta",
    },
    {
        ingredientId: "d4b2ebc6-e1fc-4b46-95cd-011bb3815e33",
        name: "English mustard",
    },
    {
        ingredientId: "4ae2f281-d5d4-44ec-b8d3-41fbc8ee0b6f",
        name: "French mustard",
    },
    {
        ingredientId: "c8040243-2740-4b85-bf44-31bbf6e194e8",
        name: "Greek feta",
    },
    {
        ingredientId: "878314a5-90c2-4e75-86b2-dc8d0fc3fa93",
        name: "Greek yoghurt",
    },
    {
        ingredientId: "890f2fdd-c0ed-4235-8cbc-5e6798d312fb",
        name: "Italian parsley",
    },
    {
        ingredientId: "a4d56479-c3c4-4cc2-b7c5-713924e033a7",
        name: "Sriracha",
    },
    {
        ingredientId: "7d29277f-9cdd-430b-92fc-470e485c9e41",
        name: "aioli",
    },
    {
        ingredientId: "39b13ccc-77cb-4ca5-a35c-6cbf8da1c6ed",
        name: "all-purpose flour",
    },
    {
        ingredientId: "f8bb1517-0a29-42f4-a979-8ae12df21cc5",
        name: "allspice",
    },
    {
        ingredientId: "fa86b750-000f-4b51-a77b-8f3fa96c0c36",
        name: "almond butter",
    },
    {
        ingredientId: "da706e1f-1d7c-4ee1-9772-4df747fc9aa0",
        name: "almond flour",
    },
    {
        ingredientId: "e54be7bb-c3dc-41d4-8cf0-b64822e98fe8",
        name: "almond oil",
    },
    {
        ingredientId: "0682142a-b92e-4e3e-ab3d-df240c78ebe6",
        name: "almond",
        namePlural: "almonds",
    },
    {
        ingredientId: "165fc982-9de9-4e33-8712-860c27d3a483",
        name: "ancho chile pepper",
        namePlural: "ancho chile peppers",
    },
    {
        ingredientId: "bdde33bf-87dd-4c74-acbb-edbb29b9e01a",
        name: "ancho powder",
    },
    {
        ingredientId: "489066e0-3fd7-4a65-8177-9488c1b906de",
        name: "apple cider vinegar",
    },
    {
        ingredientId: "fe0d5ad6-64cd-4b2d-82a9-5c2b762c63c6",
        name: "apple",
        namePlural: "apples",
    },
    {
        ingredientId: "4bb1774e-1675-4983-9224-9df67570697d",
        name: "apricot",
        namePlural: "apricots",
    },
    {
        ingredientId: "ef01895a-abdf-456d-8950-07177bc7de64",
        name: "arborio rice",
    },
    {
        ingredientId: "6f22c401-d4fe-4ae2-9af8-c355a543ffaa",
        name: "artichoke heart",
        namePlural: "artichoke hearts",
    },
    {
        ingredientId: "41e1a50f-098c-4b20-ad3c-d9068791a81b",
        name: "artichoke",
        namePlural: "artichokes",
    },
    {
        ingredientId: "e0bec2e3-8ceb-4fb2-9b2c-16000c62951a",
        name: "arugula",
    },
    {
        ingredientId: "02d4cee3-99e2-4948-87b0-7782570018c0",
        name: "asparagus",
    },
    {
        ingredientId: "3534cc98-eb08-414b-8e11-59c8971e8220",
        name: "avocado",
        namePlural: "avocados",
    },
    {
        ingredientId: "ace45d54-7d8e-4257-a649-58225f5f4b9b",
        name: "avocado oil",
    },
    {
        ingredientId: "b62c428f-c06e-4d63-a6b2-897191a986d3",
        name: "baby arugula",
    },
    {
        ingredientId: "8a561988-2c57-45f3-ac40-7105de7ae611",
        name: "baby beet",
        namePlural: "baby beets",
    },
    {
        ingredientId: "40111de2-e381-4724-84ee-e0b072131ad9",
        name: "baby bok choy",
    },
    {
        ingredientId: "f4fa944c-679f-4788-bd0e-88dbe436649c",
        name: "baby carrot",
        namePlural: "baby carrots",
    },
    {
        ingredientId: "b2380a06-9839-4e77-8690-8aa665d3d44c",
        name: "baby greens",
    },
    {
        ingredientId: "e9b79f8a-aadc-4a48-bb7c-6eed06d62d20",
        name: "baby kale",
    },
    {
        ingredientId: "a63f2fa2-5f0f-4914-bab7-5166757b2c6e",
        name: "lima beans",
    },
    {
        ingredientId: "beab43e4-f81f-4901-8abe-c73822a29a72",
        name: "baby potato",
        namePlural: "baby potatoes",
    },
    {
        ingredientId: "5fc9ba15-3255-4c7d-9b8f-9905117955ed",
        name: "baby spinach",
    },
    {
        ingredientId: "0d96497c-9e5d-4675-8a01-1d43c8929644",
        name: "baby zucchini",
    },
    {
        ingredientId: "1b7fee04-c989-477e-a239-b49661f0ceba",
        name: "baking powder",
    },
    {
        ingredientId: "31dc4931-7729-4d6a-a1d1-f869c895a823",
        name: "baking soda",
    },
    {
        ingredientId: "fddd9458-5a3a-4c22-83b2-a42689489592",
        name: "balsamic vinegar",
    },
    {
        ingredientId: "a5fe72a5-0f7a-46dc-931e-74b561c7e8fb",
        name: "banana",
        namePlural: "bananas",
    },
    {
        ingredientId: "c5a60bf4-d150-42ae-a2a7-5557b95e6a8c",
        name: "barley",
    },
    {
        ingredientId: "e8aba9bd-fd77-44b1-b1aa-3e2bdfd85353",
        name: "basil",
    },
    {
        ingredientId: "3eec4bff-4a93-4093-8918-b2b5dfc07250",
        name: "basmati rice",
    },
    {
        ingredientId: "9ef451e3-aea2-45ca-9802-a218f91dc8ee",
        name: "bay leaf",
        namePlural: "bay leaves",
    },
    {
        ingredientId: "f84e9bf0-9781-4f0b-a908-fbf387d690bd",
        name: "bean curd",
    },
    {
        ingredientId: "509766bd-0391-48c4-bf80-857d40157143",
        name: "bean paste",
    },
    {
        ingredientId: "fa94b645-0a31-479d-87c4-7d19527d691c",
        name: "beansprouts",
    },
    {
        ingredientId: "004d38bb-43de-4d57-8aa4-c70ac916565b",
        name: "beetroot",
        namePlural: "beetroots",
    },
    {
        ingredientId: "009864c7-40a5-4681-bcf9-06b342b4ae0d",
        name: "black beans",
    },
    {
        ingredientId: "c26998c2-602e-4afc-a85b-b16a91fc52e2",
        name: "black mustard seeds",
    },
    {
        ingredientId: "f75971da-a9b7-4ef8-b7e3-c7ac4dcb4e4b",
        name: "black olives",
    },
    {
        ingredientId: "a29245f7-88f6-408b-a00a-89ddde1d042e",
        name: "black pepper",
    },
    {
        ingredientId: "ce79c2b2-ba64-4282-be26-feb4839a78d5",
        name: "black-eyed peas",
    },
    {
        ingredientId: "6be0330f-e789-4695-9d41-69153337e380",
        name: "blackberries",
    },
    {
        ingredientId: "1eb0bef0-b1c7-4557-8541-ec1485c373b1",
        name: "blueberries",
    },
    {
        ingredientId: "5539de4b-2f4c-4736-909b-61dff33c0c29",
        name: "bocconcini",
    },
    {
        ingredientId: "546457da-bf5f-4c63-826b-76bb1afe1ee5",
        name: "bok choy",
    },
    {
        ingredientId: "5d5349f3-4796-4971-93b9-0f4d65d6414d",
        name: "brazil nuts",
    },
    {
        ingredientId: "3d45d217-e5d8-4b4e-8c41-cc084bf2993c",
        name: "bread crumbs",
    },
    {
        ingredientId: "edc3bcae-b4e6-44df-a018-7e3014db0917",
        name: "brie cheese",
    },
    {
        ingredientId: "7c77c0e3-e059-41b3-91a4-7eee206dd66b",
        name: "brioche bun",
        namePlural: "brioche buns",
    },
    {
        ingredientId: "cdeb4b08-2410-499f-8d31-08b5ce2f6173",
        name: "broccoli",
    },
    {
        ingredientId: "121666de-b269-4e6c-afdc-b24b7b0dfb14",
        name: "brown basmati rice",
    },
    {
        ingredientId: "5a11ef59-59ad-46bf-b229-986d2d4c3e23",
        name: "brown lentils",
    },
    {
        ingredientId: "f28f152e-1665-4ed4-9d77-7b0054a3bda9",
        name: "brown mustard seeds",
    },
    {
        ingredientId: "e0b1c61b-97f9-418a-9828-0352d36f5313",
        name: "brown rice",
    },
    {
        ingredientId: "afd4f924-706a-4369-869c-4307f117d784",
        name: "brown sugar",
    },
    {
        ingredientId: "d117b4f4-400c-4726-82d5-ce5b2c4571a8",
        name: "brussels sprouts",
    },
    {
        ingredientId: "df6d1698-0071-4d08-8afb-b506c54c3edd",
        name: "buffalo mozzarella",
    },
    {
        ingredientId: "fd0832c0-7610-431b-b440-f75b8016005c",
        name: "butter",
    },
    {
        ingredientId: "0ab4ac65-964e-415c-9166-e699645c026e",
        name: "buttercup squash",
    },
    {
        ingredientId: "f0b2e04d-96bc-4b5d-a88e-dad8550393dd",
        name: "buttermilk",
    },
    {
        ingredientId: "693520e1-dc25-4e9a-b50f-e80181685b1b",
        name: "butternut squash",
    },
    {
        ingredientId: "38df34e1-93df-4c94-bf7a-e07d9d4d72b5",
        name: "cabbage",
        namePlural: "cabbages",
    },
    {
        ingredientId: "dbcb2b3c-3dbf-4b39-945b-ef5dccc37726",
        name: "cajun seasoning",
    },
    {
        ingredientId: "8fba0fe9-8f3d-44f1-b5c8-076645eaf372",
        name: "camembert",
    },
    {
        ingredientId: "74b00f6a-4471-403d-a0dc-4b0707ac4af4",
        name: "cannellini beans",
    },
    {
        ingredientId: "3c1fc96e-cb0f-4225-b9d0-1d534a99969a",
        name: "canola oil",
    },
    {
        ingredientId: "20458b88-0489-4117-9045-95c478b9d382",
        name: "capers",
    },
    {
        ingredientId: "aee00d85-49de-44da-be8a-8405c3f36f85",
        name: "cardamom seeds",
    },
    {
        ingredientId: "691f1c32-967d-4321-9617-fa54d28d4b82",
        name: "carrot",
        namePlural: "carrots",
    },
    {
        ingredientId: "948d4e94-4c1b-4bb3-b974-eebab5c9a4e2",
        name: "cashew nuts",
    },
    {
        ingredientId: "8c173580-fe21-4bb0-ad66-eb92b41a51c9",
        name: "caster sugar",
    },
    {
        ingredientId: "5b8dff02-6d84-40ad-a660-00057bad54ce",
        name: "cauliflower",
    },
    {
        ingredientId: "1b989992-7274-4225-a9b3-b7441ad8c43e",
        name: "cayenne pepper",
    },
    {
        ingredientId: "2424a88a-dc89-45e2-984e-51413b7a17b1",
        name: "celery",
    },
    {
        ingredientId: "6a2a41d7-e5ef-44bd-b1fb-630620501a3f",
        name: "cheddar cheese",
    },
    {
        ingredientId: "3351aaa1-d7d6-475e-a3cd-f0202e319837",
        name: "cherries",
    },
    {
        ingredientId: "0a2d8cd5-d4af-465c-ba6a-da8c22c9a0de",
        name: "cherry tomato",
        namePlural: "cherry tomatoes",
    },
    {
        ingredientId: "22de467e-6eb0-4317-b479-59a574f8ce8a",
        name: "chickpeas",
    },
    {
        ingredientId: "c9a20651-9034-49d5-9603-26edef6c1b9e",
        name: "chili flakes",
    },
    {
        ingredientId: "559c80ee-f778-4d1c-b693-3a04a874e253",
        name: "chili powder",
    },
    {
        ingredientId: "1d51144d-ee28-40fa-ad68-4b849efe8861",
        name: "chipotle chile",
    },
    {
        ingredientId: "0348beac-d465-4270-acde-25d820aa354b",
        name: "chipotle chile powder",
    },
    {
        ingredientId: "97084084-82f0-4f72-b407-78019f2edd1a",
        name: "chipotle paste",
    },
    {
        ingredientId: "a0659f01-e7e6-4291-a87d-96cd02371b23",
        name: "chipotle pepper",
        namePlural: "chipotle peppers",
    },
    {
        ingredientId: "62092667-2b79-405a-be5f-c96bb9dff0b5",
        name: "chive",
        namePlural: "chives",
    },
    {
        ingredientId: "ad4462c2-f142-4fc2-81d7-3bf05046038a",
        name: "cilantro",
    },
    {
        ingredientId: "b356f69c-8b10-4d44-81b7-447386d0a5b2",
        name: "cinnamon",
    },
    {
        ingredientId: "aa732be6-3a0e-41c3-bd91-67006196b669",
        name: "clove",
        namePlural: "cloves",
    },
    {
        ingredientId: "cb3cf6d3-8856-42ac-89d3-647821fc73ce",
        name: "cocoa powder",
    },
    {
        ingredientId: "9d6948c3-778f-459f-80f1-979f0c7e4b42",
        name: "coconut",
        namePlural: "coconuts",
    },
    {
        ingredientId: "aab8a2ad-a3c9-439b-ae60-4fbe3592f84e",
        name: "coconut cream",
    },
    {
        ingredientId: "bf6f77a4-f031-48dd-92f5-c69a2fe3d328",
        name: "coconut milk",
    },
    {
        ingredientId: "e67d6f7b-9bba-4c8e-a903-0ef741e0b094",
        name: "coconut oil",
    },
    {
        ingredientId: "fea7b6e5-5860-4368-81dc-30a1f0676112",
        name: "coconut water",
    },
    {
        ingredientId: "cc365efa-88de-4252-9759-cfb90f640a0a",
        name: "colby cheese",
    },
    {
        ingredientId: "25113603-d7e2-4099-bda4-ae791a5df728",
        name: "conchiglione",
    },
    {
        ingredientId: "ef319bf9-c8ff-4a50-b912-2319a2c3edd8",
        name: "coriander",
    },
    {
        ingredientId: "d0413a51-0fda-4bff-8ab6-db5251c7bb28",
        name: "coriander seeds",
    },
    {
        ingredientId: "f6e5b321-aaba-462f-85d6-911ab15465e9",
        name: "corn",
    },
    {
        ingredientId: "9c2949c2-0ea9-4df7-b133-0450e219c076",
        name: "corn flour",
    },
    {
        ingredientId: "3a396930-d02b-4882-9f68-98700232230d",
        name: "cottage cheese",
    },
    {
        ingredientId: "97fe8bca-42ff-4608-b283-9efafac0cd61",
        name: "couscous",
    },
    {
        ingredientId: "a9d7750c-cdaf-45be-9415-3f8eb3e1c428",
        name: "cream",
    },
    {
        ingredientId: "706e3ba6-185b-4512-a012-7a45dabc006d",
        name: "cream cheese",
    },
    {
        ingredientId: "da939336-c7e0-43a0-85c3-891b99b94913",
        name: "cream of tartar",
    },
    {
        ingredientId: "0e056f9c-0b7b-40a7-aac8-2796833740af",
        name: "crème fraîche",
    },
    {
        ingredientId: "390982c7-f129-4d8b-8fae-72a113b80274",
        name: "cucumber",
        namePlural: "cucumbers",
    },
    {
        ingredientId: "2a67c525-a200-464f-aea8-9baeff3da1cd",
        name: "cumin",
    },
    {
        ingredientId: "a82e4b51-020d-4185-a543-a72be3d5b291",
        name: "curry leaf",
        namePlural: "curry leaves",
    },
    {
        ingredientId: "5483bb73-9303-4689-930f-f5747b7fac5f",
        name: "curry powder",
    },
    {
        ingredientId: "f14d4b18-ebda-4db2-b49c-3653d9222922",
        name: "dark soy sauce",
    },
    {
        ingredientId: "9f81b1f4-b667-468f-9534-121ab867bf47",
        name: "date",
        namePlural: "dates",
    },
    {
        ingredientId: "d431a660-f24b-456a-8243-cf0a4fb107a5",
        name: "dijon mustard",
    },
    {
        ingredientId: "10894142-9fc6-4f11-9542-cf91253bff9d",
        name: "dill",
    },
    {
        ingredientId: "62806ce5-8f6d-4a5f-9b4c-689a7eed4fe9",
        name: "dill pickle",
        namePlural: "dill pickles",
    },
    {
        ingredientId: "ebd0aad1-34f2-4540-8526-ef33b68ba292",
        name: "double cream",
    },
    {
        ingredientId: "18b37349-6d39-4898-b935-507bbcfb9342",
        name: "aubergine",
        namePlural: "aubergines",
    },
    {
        ingredientId: "13945396-ca26-40c6-8858-886edd9438eb",
        name: "egg",
        namePlural: "eggs",
    },
    {
        ingredientId: "0d909f1d-df27-42a6-8a3d-f77a0d0c4bb8",
        name: "evaporated milk",
    },
    {
        ingredientId: "3d755d7a-ad6f-4bc1-8b84-b9598f92129d",
        name: "extra firm tofu",
    },
    {
        ingredientId: "25ab5377-b7f1-41eb-b5a6-03f5a1de04ba",
        name: "fava beans",
    },
    {
        ingredientId: "a4be818f-85d2-4012-8778-00d7b3a9fb22",
        name: "fennel bulb",
        namePlural: "fennel bulbs",
    },
    {
        ingredientId: "88ca1235-d563-476d-ad09-45df844f190c",
        name: "fennel seeds",
    },
    {
        ingredientId: "fbeb5f5f-d476-42e2-b0f2-64d0e04386e0",
        name: "fenugreek leaves",
    },
    {
        ingredientId: "7845de8d-b1bc-4963-9161-7bc639b90ed2",
        name: "fenugreek seeds",
    },
    {
        ingredientId: "6abed29e-5c9c-4b02-aa7a-3d33272bd24b",
        name: "feta cheese",
    },
    {
        ingredientId: "ee22d910-97ec-4ea6-9412-d409a0a1d2f4",
        name: "fettuccine pasta",
    },
    {
        ingredientId: "a9bc8594-74c4-4321-8a50-a1ac6202c6aa",
        name: "fig",
        namePlural: "figs",
    },
    {
        ingredientId: "0a77f732-a59e-429f-a683-84d0a52368c6",
        name: "firm tofu",
    },
    {
        ingredientId: "08dedb6f-7883-4dce-a512-5f1e10692354",
        name: "garam masala",
    },
    {
        ingredientId: "f7818a59-abc1-494d-a3b3-105c441b29e9",
        name: "garbanzo beans",
    },
    {
        ingredientId: "4731ab8e-77d2-4f88-9da8-48b6be04e720",
        name: "garlic",
    },
    {
        ingredientId: "5f97f313-d346-4a4b-ab3e-3e28954f8bb7",
        name: "garlic powder",
    },
    {
        ingredientId: "0de03ec8-9670-4f47-8e4e-ea33f6d65393",
        name: "ghee",
    },
    {
        ingredientId: "a05bbd0b-1e7f-4b6c-b786-9128019a994f",
        name: "gherkin",
        namePlural: "gherkins",
    },
    {
        ingredientId: "543424d2-dc39-4e60-8ece-8cfa61de3847",
        name: "ginger",
    },
    {
        ingredientId: "851c10ac-8e77-424b-82b8-a863b789a4fc",
        name: "goat cheese",
    },
    {
        ingredientId: "6f68ed73-58d2-4bd8-bb84-6d2c280a15fc",
        name: "goji berries",
    },
    {
        ingredientId: "833f3d71-0c48-431d-be30-957ad1a45207",
        name: "golden syrup",
    },
    {
        ingredientId: "18cf2a6b-7132-415c-977c-288d58390e02",
        name: "granulated garlic",
    },
    {
        ingredientId: "dece5e70-0312-47cd-a052-86f6b694d2ff",
        name: "green capsicum",
        namePlural: "green capsicums",
    },
    {
        ingredientId: "3b75ebe2-6456-4c4c-b66e-dadc633cd4de",
        name: "green chili",
        namePlural: "green chilies",
    },
    {
        ingredientId: "97b99360-fb90-4948-899a-c2a9a939c576",
        name: "guacamole",
    },
    {
        ingredientId: "700ec7ce-2be2-4f67-ab98-12ec92467e99",
        name: "habanero pepper",
        namePlural: "habanero peppers",
    },
    {
        ingredientId: "81db02ca-573b-45c2-ab11-e824d62d4197",
        name: "halloumi",
    },
    {
        ingredientId: "3fd934d9-d0e8-4a7e-a7da-b6db6840ff60",
        name: "hazelnuts",
    },
    {
        ingredientId: "efc81e22-494f-403b-aa67-ec4d718cc742",
        name: "heavy cream",
    },
    {
        ingredientId: "0899fa4b-b202-4aba-899e-b3ead9831f5f",
        name: "honey",
    },
    {
        ingredientId: "ccc03be5-eb51-456c-af0a-eff6c937348b",
        name: "jackfruit",
        namePlural: "jackfruits",
    },
    {
        ingredientId: "add1bec0-e5e0-4c8a-8809-ec5550975d2a",
        name: "jalapeno chili",
        namePlural: "jalapeno chilies",
    },
    {
        ingredientId: "b45f1e32-6e95-4398-bc49-dd092b95d7b7",
        name: "jasmine rice",
    },
    {
        ingredientId: "e1000891-1cac-475d-8ffc-2137afc6efb3",
        name: "kaffir lime leaf",
        namePlural: "kaffir lime leaves",
    },
    {
        ingredientId: "be084ae8-ab4d-4a03-8d0b-3e327493bdf9",
        name: "kale",
    },
    {
        ingredientId: "c607073d-78e1-4016-a51a-12f61531ec78",
        name: "kasuri methi",
    },
    {
        ingredientId: "a69db12a-849d-40f5-9fae-63924de3d3d6",
        name: "kidney beans",
    },
    {
        ingredientId: "b6cb983e-0e96-446c-bc68-6720337ba269",
        name: "kimchi",
    },
    {
        ingredientId: "6b0645ef-2189-4e90-9668-3933df5562df",
        name: "kosher salt",
    },
    {
        ingredientId: "d6401808-bc96-4bab-9933-b4fc0496fcab",
        name: "lasagna noodles",
    },
    {
        ingredientId: "53ce2dad-06b0-4d65-8b2c-53e8510590e9",
        name: "leek",
        namePlural: "leeks",
    },
    {
        ingredientId: "f6604a49-970f-46d1-967e-ef59427c6311",
        name: "lemon",
        namePlural: "lemons",
    },
    {
        ingredientId: "0a8ebad9-2436-4064-a1bb-f3d0eef2229c",
        name: "lemon juice",
    },
    {
        ingredientId: "979a66a7-7363-418f-81e4-85905e91e22f",
        name: "lemon zest",
    },
    {
        ingredientId: "3458573d-cf4a-41e6-ae61-794d33d7b8de",
        name: "lentils",
    },
    {
        ingredientId: "a3b1b25d-fb38-4c35-a297-5e9345e4e2dd",
        name: "lettuce",
    },
    {
        ingredientId: "73f871f1-706e-46f9-a9a0-a128ce7758e9",
        name: "lime",
        namePlural: "limes",
    },
    {
        ingredientId: "e6fb0fb9-4b4e-47c0-b249-f141f09a0dc9",
        name: "lime juice",
    },
    {
        ingredientId: "e9366df4-2aaf-4d4b-8e92-9b197ef7e9d6",
        name: "lime zest",
    },
    {
        ingredientId: "ba228c0b-8f84-4680-b49a-8b07f40a7f2e",
        name: "linguine",
    },
    {
        ingredientId: "ecf7f689-d474-4890-b40d-0419d4cc06e2",
        name: "liquorice",
    },
    {
        ingredientId: "703e0e8e-c131-4e9d-b974-4395b8c0f4ed",
        name: "lychee",
        namePlural: "lychees",
    },
    {
        ingredientId: "0d72e81c-a190-454b-bc08-6352081865a0",
        name: "macadamia nuts",
    },
    {
        ingredientId: "04228760-afa2-42bd-b35d-e21238c7bd8d",
        name: "macaroni",
    },
    {
        ingredientId: "8c1406ed-68b1-49b8-8c72-167c4dd070fc",
        name: "mango",
        namePlural: "mangoes",
    },
    {
        ingredientId: "d3382ca6-9670-4f08-9085-4d53bf3c1411",
        name: "maple syrup",
    },
    {
        ingredientId: "8d3714c7-31ab-47bf-b93e-50bd0517663c",
        name: "mascarpone",
    },
    {
        ingredientId: "c776797c-a03d-4ba8-a8f3-a46efffc8d2d",
        name: "mayonaise",
    },
    {
        ingredientId: "8a0ca185-1a3f-4cb2-baf5-3d3b9828cbeb",
        name: "medjool date",
        namePlural: "medjool dates",
    },
    {
        ingredientId: "a520740b-c337-408d-bfae-6486611f5340",
        name: "milk",
    },
    {
        ingredientId: "e2a20e96-39c1-46c8-b2ed-448acc7af85a",
        name: "mint",
    },
    {
        ingredientId: "d1a15f4e-97ed-4e58-90bf-ea3c43a542b7",
        name: "mirin",
    },
    {
        ingredientId: "4bc9bf1a-3f0a-4ab1-a324-3877881fd870",
        name: "miso",
    },
    {
        ingredientId: "7fb6139c-0ccc-4d52-96a8-54deac491f4c",
        name: "molasses",
    },
    {
        ingredientId: "020ed532-50e5-4703-9b6a-185b5f6b9485",
        name: "monterey jack",
    },
    {
        ingredientId: "c8ac8661-4a9e-4a81-a5f2-0c18bd6513f4",
        name: "mozzarella",
    },
    {
        ingredientId: "ea3c9a7b-47f2-43aa-a078-7ba2cca8b8df",
        name: "mozzarella ball",
        namePlural: "mozzarella balls",
    },
    {
        ingredientId: "2dfaa4cf-bcc5-41c4-a44d-c3a84c6baf06",
        name: "mushroom",
        namePlural: "mushrooms",
    },
    {
        ingredientId: "1ef0b0f0-67fc-4e6a-9bb4-549f0e733227",
        name: "mustard",
    },
    {
        ingredientId: "9908f723-139e-4c45-81c9-e41c624d7e01",
        name: "mustard seeds",
    },
    {
        ingredientId: "60620f96-27da-4123-bf96-f114747320bc",
        name: "nectarine",
        namePlural: "nectarines",
    },
    {
        ingredientId: "fb778090-ac5f-4fc8-bda3-7d3d68ebcc08",
        name: "nigella seeds",
    },
    {
        ingredientId: "48b1d56e-d0f3-40f6-8d38-095d6a230196",
        name: "noodles",
    },
    {
        ingredientId: "ebbd43ad-41bb-40f5-907a-edf43d59950a",
        name: "nori",
    },
    {
        ingredientId: "16059087-c8a9-4565-9981-29c96bf101ee",
        name: "nutmeg",
    },
    {
        ingredientId: "feedf2a9-59fc-422e-9c29-4047a83cfbe5",
        name: "nutritional yeast",
    },
    {
        ingredientId: "d13d1ecf-5454-4add-92a0-4fff40f794cf",
        name: "oat milk",
    },
    {
        ingredientId: "64a0f8b2-1b92-428b-acb0-0c2f5d3186dc",
        name: "oats",
    },
    {
        ingredientId: "9ba6e8fe-be11-4048-a69f-e31cb9fd82e8",
        name: "okra",
    },
    {
        ingredientId: "5180aa6c-d014-4f7a-82f6-0f3d15d204e3",
        name: "olive oil",
    },
    {
        ingredientId: "ae4d700c-0f7f-45fd-93b4-1839659496e6",
        name: "olive",
        namePlural: "olives",
    },
    {
        ingredientId: "ee15e2c5-27c1-41db-9ce5-ad418be0a3cc",
        name: "onion powder",
    },
    {
        ingredientId: "757f8135-303f-4d06-8d5d-ec98d03bfc51",
        name: "onion",
        namePlural: "onions",
    },
    {
        ingredientId: "ef19f880-6eca-4dec-b089-6f90d7e5da5c",
        name: "orange",
        namePlural: "oranges",
    },
    {
        ingredientId: "308bde79-20c9-4b15-b4f5-a325ef11c997",
        name: "orange capsicum",
        namePlural: "orange capsicums",
    },
    {
        ingredientId: "3cd220cf-3519-45dc-a037-d51f42cf3728",
        name: "orange zest",
    },
    {
        ingredientId: "40ce904c-c1b8-4029-9086-8487a02e5ede",
        name: "oregano",
    },
    {
        ingredientId: "b3b4d914-8ec2-46ab-ae28-18b61410f757",
        name: "orzo",
    },
    {
        ingredientId: "2ea6e99a-5632-471d-bd5c-6793c6e470cb",
        name: "paneer",
    },
    {
        ingredientId: "d47a8fd7-3330-4cdd-9c5e-9b38e3460eff",
        name: "panko breadcrumbs",
    },
    {
        ingredientId: "428e9b6f-c064-44b1-9855-d5f49b0dae46",
        name: "paprika",
    },
    {
        ingredientId: "4120161f-e73e-46d1-9d96-05b53f8fa1ee",
        name: "parmesan cheese",
    },
    {
        ingredientId: "8f1d9da2-b9ef-4130-a4fd-3aa2beb9eac1",
        name: "parsley",
    },
    {
        ingredientId: "2922d584-1189-4ad9-b646-2483df156c6d",
        name: "parsnip",
        namePlural: "parsnips",
    },
    {
        ingredientId: "c4e53ec8-1a15-4b07-9d59-fb3593138b2a",
        name: "passata",
    },
    {
        ingredientId: "0fc5ca6a-20ec-442d-8ead-11d9c4961cf9",
        name: "peach",
        namePlural: "peaches",
    },
    {
        ingredientId: "6874e01b-725e-4a2b-b106-54a7f845c69d",
        name: "peanut butter",
    },
    {
        ingredientId: "4e69e778-ec37-4053-a9fa-efd4db5a0679",
        name: "peanut oil",
    },
    {
        ingredientId: "aa2e1147-02cd-4d24-a13a-f6687f4c6aad",
        name: "peanuts",
    },
    {
        ingredientId: "bc8e63e5-3eb4-4925-9f15-9ee3b50e69de",
        name: "pear",
        namePlural: "pears",
    },
    {
        ingredientId: "a876d795-c562-48ca-90e2-b41c9febc8dd",
        name: "peas",
    },
    {
        ingredientId: "f5f13073-f6c6-40d5-96d6-c230bb44ccf3",
        name: "pecans",
    },
    {
        ingredientId: "2d1d3a85-2ca1-43ef-bd79-fec8d8e78a4c",
        name: "pecorino romano cheese",
    },
    {
        ingredientId: "5514d0e5-ffd7-41c9-9227-cf5b4d03932c",
        name: "penne rigate",
    },
    {
        ingredientId: "8882f5d5-ed1e-4b0e-abb9-fcff2646c563",
        name: "pepper",
    },
    {
        ingredientId: "656f362d-f1f7-43c1-ba0a-2ce60e55327a",
        name: "peppercorns",
    },
    {
        ingredientId: "856d4149-34db-4295-8b97-0edc5bb2d2d8",
        name: "pickled jalapenos",
    },
    {
        ingredientId: "6cd5f00d-f4e4-4291-8d4b-5bb5ee365271",
        name: "pickles",
    },
    {
        ingredientId: "cebaec60-bc1b-48ec-8034-2fc45769de8c",
        name: "pico de gallo",
    },
    {
        ingredientId: "118fea66-a08a-407f-a94c-e8dcf18ab41d",
        name: "pineapple",
        namePlural: "pineapples",
    },
    {
        ingredientId: "a260f585-bdcd-485d-b056-0a4c224ea9bf",
        name: "pineapple juice",
    },
    {
        ingredientId: "9280a045-699a-4d4b-8b98-3190f1d91da3",
        name: "pinenuts",
    },
    {
        ingredientId: "090ffef2-d3fa-4ba2-bfee-a9a62e9e699e",
        name: "pinto beans",
    },
    {
        ingredientId: "bc18545e-881c-472f-9417-c81ea8d09ef1",
        name: "pistachios",
    },
    {
        ingredientId: "67b1ad79-2307-4eba-8985-1707e0cdb68e",
        name: "pita bread",
    },
    {
        ingredientId: "d9b571ca-82e5-49ee-8d60-373b9f4fdbd3",
        name: "poblano pepper",
        namePlural: "poblano peppers",
    },
    {
        ingredientId: "44850436-0cad-455a-aa98-987149fd8579",
        name: "polenta",
    },
    {
        ingredientId: "5d698e8c-cb2c-48a4-b8e9-7ec5d0dc2663",
        name: "pomegranate",
        namePlural: "pomegranates",
    },
    {
        ingredientId: "fa1809c8-c9e6-4ef9-b673-4c41d2c6c8e3",
        name: "pomegranate seeds",
    },
    {
        ingredientId: "e58ddf82-b011-4a44-a520-4e125ad7ce1d",
        name: "poppy seeds",
    },
    {
        ingredientId: "e069e0bd-4f49-4180-bc5e-c6715a4dbc24",
        name: "potato gnocchi",
    },
    {
        ingredientId: "f78a11f5-7031-4918-9d39-538f3b6d02cd",
        name: "potato",
        namePlural: "potatoes",
    },
    {
        ingredientId: "9b371ac6-3bcf-46e1-b82b-8f4f459245fe",
        name: "provolone cheese",
    },
    {
        ingredientId: "0b000c25-5984-4882-ac31-73e868f2958a",
        name: "puff pastry",
    },
    {
        ingredientId: "3fef04aa-8b6b-46c3-9201-100982ddc82b",
        name: "pumpkin",
        namePlural: "pumpkins",
    },
    {
        ingredientId: "4e4d225d-6a66-423a-917d-0f79e1bb3d4d",
        name: "pumpkin seeds",
    },
    {
        ingredientId: "3424bc2b-9c06-42c6-9ae1-91cb9bde987a",
        name: "queso fresco",
    },
    {
        ingredientId: "cf474c2f-7eb8-41cd-9605-338bf0369f7e",
        name: "quinoa",
    },
    {
        ingredientId: "6361e00c-abb1-4681-b926-18942e7989fc",
        name: "radish",
        namePlural: "radishes",
    },
    {
        ingredientId: "1829367a-e9ce-4fa1-b2f1-e1569693c41e",
        name: "raisins",
    },
    {
        ingredientId: "61535d0a-829a-4a6a-a13f-84cbf784b6b6",
        name: "rapeseed oil",
    },
    {
        ingredientId: "30fb6a48-c46e-4baf-909c-2d1cbbd7ed48",
        name: "raspberries",
    },
    {
        ingredientId: "d0e03f10-8cf1-4655-a7e9-680cf399513e",
        name: "red cabbage",
        namePlural: "red cabbages",
    },
    {
        ingredientId: "28b8014d-377f-43ac-ad6c-76041facd426",
        name: "red capsicum",
        namePlural: "red capsicums",
    },
    {
        ingredientId: "93fe65de-17ab-4864-9bff-993603adc15e",
        name: "red curry paste",
    },
    {
        ingredientId: "39d10aee-e287-4464-8ea0-6988032633c8",
        name: "red lentils",
    },
    {
        ingredientId: "5ff1764f-eb60-4c0e-aa2b-b6b4a3f8f10c",
        name: "red miso",
    },
    {
        ingredientId: "cc4426fa-6098-4f26-a04d-d4106fb2a8d1",
        name: "red onion",
        namePlural: "red onions",
    },
    {
        ingredientId: "b22081d2-c5b9-44fa-a21e-83015b14f3e3",
        name: "red wine vinegar",
    },
    {
        ingredientId: "afbc0b7c-fd1f-4837-8842-bf3c92a79e4d",
        name: "refried beans",
    },
    {
        ingredientId: "0467ecff-7dc2-4733-8695-906a358bc40d",
        name: "rhubarb",
    },
    {
        ingredientId: "7343ebbb-1974-4d83-9e3f-5db7eacc45b7",
        name: "rice",
    },
    {
        ingredientId: "dedc2ac3-1971-4d99-9613-50299ccc6813",
        name: "rice noodles",
    },
    {
        ingredientId: "2d55340e-47a2-4e9a-8a18-037bc37ebea6",
        name: "rice paper",
    },
    {
        ingredientId: "266932d0-85bc-4248-ae67-94cee6e5c851",
        name: "rice vinegar",
    },
    {
        ingredientId: "cb331346-b125-4c7a-9ccd-a57e1e36ff1b",
        name: "ricotta cheese",
    },
    {
        ingredientId: "a5b75670-0034-4d1e-bde7-dd82a5313978",
        name: "rigatoni",
    },
    {
        ingredientId: "6a31fa45-403f-47f7-9f63-5ff3bf54ed95",
        name: "risotto",
    },
    {
        ingredientId: "19d53e44-046e-4303-a76e-a340703d44d1",
        name: "rolled oats",
    },
    {
        ingredientId: "08fe27cf-4396-4a8e-bb9e-a06527941902",
        name: "romaine lettuce",
    },
    {
        ingredientId: "fb3ff50a-e5a9-4817-ae71-8fbdb678e836",
        name: "rosemary",
    },
    {
        ingredientId: "4dac9842-c22a-4675-b14c-1f5cbc78a8f8",
        name: "russet potato",
        namePlural: "russet potatoes",
    },
    {
        ingredientId: "e5162978-d7f6-4646-841c-66c565980dca",
        name: "saffron",
    },
    {
        ingredientId: "9abcb0f3-b294-4b0d-b9ad-52a3b11ecb77",
        name: "sage",
    },
    {
        ingredientId: "c8bf6ea2-92ce-481f-8a6b-e4f99001df95",
        name: "sake",
    },
    {
        ingredientId: "f2e26987-23fc-4f65-8d1d-eeffbc129a8f",
        name: "salsa",
    },
    {
        ingredientId: "b0c8cd9e-aba2-4e9d-ad17-3cf6917dbb8c",
        name: "salted butter",
    },
    {
        ingredientId: "5c11c598-fee8-4be7-9f1c-ae4bdaf37f9a",
        name: "sea salt",
    },
    {
        ingredientId: "379e5d95-a26c-4da1-9060-8870ce6c7a37",
        name: "self rising flour",
    },
    {
        ingredientId: "3a8fa1ae-0208-493e-93dc-b3ac3e3b5246",
        name: "semolina",
    },
    {
        ingredientId: "d7dcddd9-493a-4acb-86e0-2fa3679c9455",
        name: "serrano pepper",
        namePlural: "serrano peppers",
    },
    {
        ingredientId: "982cde6c-4a7f-46b2-9d55-0f0fb69e5150",
        name: "sesame oil",
    },
    {
        ingredientId: "fd98fdaa-cfc3-4b83-99f3-c34e395d17ad",
        name: "sesame paste",
    },
    {
        ingredientId: "9dd6c3d0-9d35-4949-8a75-baad85af1ff0",
        name: "sesame seeds",
    },
    {
        ingredientId: "f2886993-172f-4c60-b9f6-718eb9865e97",
        name: "shallot",
        namePlural: "shallots",
    },
    {
        ingredientId: "86749130-89fe-439e-97d4-77c7b5bb9e3f",
        name: "short-grain rice",
    },
    {
        ingredientId: "6f0e6b4d-4758-475c-adf0-3bcd365e3676",
        name: "silken tofu",
    },
    {
        ingredientId: "24b407ba-2525-4534-ad01-8da639872940",
        name: "silverbeet",
    },
    {
        ingredientId: "f1e941f2-85e9-4910-bf8f-47a62cd5da00",
        name: "smoked paprika",
    },
    {
        ingredientId: "686364af-5571-43b6-bb69-b15c0516e3da",
        name: "snow peas",
    },
    {
        ingredientId: "573245d8-e0be-4c18-ac2e-cef3e1c8a7a1",
        name: "sour cream",
    },
    {
        ingredientId: "7197d8e0-3edd-4a10-8768-b3ed78c0b2c0",
        name: "soy milk",
    },
    {
        ingredientId: "bdd442e4-2c4a-4a1f-bb88-e65d1e4feb3e",
        name: "spaghetti",
    },
    {
        ingredientId: "40004625-d899-4848-8da5-b580d1aab04b",
        name: "spinach",
    },
    {
        ingredientId: "92b695fc-4fb1-4694-973a-0162228a52ff",
        name: "spring onion",
        namePlural: "spring onions",
    },
    {
        ingredientId: "769d3646-e45b-4a0b-a249-476868df0b5b",
        name: "star anise",
    },
    {
        ingredientId: "348a3b9e-2ef2-42e2-a753-10fce9fe61f9",
        name: "strawberries",
    },
    {
        ingredientId: "eda6c8c0-2697-4cd9-90f4-8cfa6ee92b90",
        name: "string beans",
    },
    {
        ingredientId: "f37e8d97-5a92-4bfb-b706-2fa374a3f0f3",
        name: "sun-dried tomatoes",
    },
    {
        ingredientId: "4a69764f-bb92-4511-a17b-864720b51e36",
        name: "sunflower oil",
    },
    {
        ingredientId: "e62aa5e5-433c-4a78-9ff9-498b5a41415e",
        name: "sunflower seeds",
    },
    {
        ingredientId: "b5208351-d003-46be-ac14-8cf37f1ff1e6",
        name: "sweet potato",
        namePlural: "sweet potatoes",
    },
    {
        ingredientId: "7b9fd833-bb05-4295-850b-3307ad3107df",
        name: "swiss cheese",
    },
    {
        ingredientId: "bd539071-e702-4637-9945-fc7fe1038acf",
        name: "tahini",
    },
    {
        ingredientId: "15d41996-7c33-4d27-8400-0febdf35726e",
        name: "tamarind paste",
    },
    {
        ingredientId: "c0b8393b-ffc7-44b8-9c8b-15bedce916e2",
        name: "thai basil",
    },
    {
        ingredientId: "49fea811-de21-4935-8e0b-fe5332e7357c",
        name: "thyme",
    },
    {
        ingredientId: "b5cfb679-e2b9-4a74-8b48-cd271b8148d6",
        name: "tomato ketchup",
    },
    {
        ingredientId: "94c76f83-30aa-4a70-ab53-64718124628a",
        name: "tomato paste",
    },
    {
        ingredientId: "699016d0-549c-4f8e-a593-bf9fbc98082f",
        name: "tomato",
        namePlural: "tomatoes",
    },
    {
        ingredientId: "433de97b-5a55-4cbd-906c-c0fc03dac060",
        name: "tortilla chips",
    },
    {
        ingredientId: "f4037540-90ef-4a1b-b857-8a6939897a99",
        name: "tortilla",
        namePlural: "tortillas",
    },
    {
        ingredientId: "86651139-b980-4929-9b2d-b5bea6ac83fe",
        name: "tumeric",
    },
    {
        ingredientId: "27cd6f38-1032-4e43-b0a5-318f8eb732f7",
        name: "turnip",
        namePlural: "turnips",
    },
    {
        ingredientId: "f541a041-4bac-49a8-8452-5f7686479e17",
        name: "tzatziki",
    },
    {
        ingredientId: "3f7ce6a6-86fc-4c04-b65d-ca4a1f248342",
        name: "unsalted butter",
    },
    {
        ingredientId: "18a84114-bc3c-4225-8f17-96b58de0ff9b",
        name: "vanilla bean",
        namePlural: "vanilla beans",
    },
    {
        ingredientId: "473e2e55-6652-4988-b5fa-58a7d390e215",
        name: "vanilla essence",
    },
    {
        ingredientId: "c20607fb-476e-4db0-9c5d-e744bd7e137f",
        name: "vanilla extract",
    },
    {
        ingredientId: "bfa57d96-2fea-4387-a809-e9fa833e16ef",
        name: "vegetable broth",
    },
    {
        ingredientId: "13d52534-cbba-4d81-bec7-668c9e7f64f8",
        name: "vegetable oil",
    },
    {
        ingredientId: "e63989a5-93ed-4c08-ba15-71828ab7a01a",
        name: "vegetable stock",
    },
    {
        ingredientId: "84acc856-1c94-4f85-a60e-e0cbaf6b5ebd",
        name: "vinegar",
    },
    {
        ingredientId: "ff786e81-bba6-4dae-9cbf-6f49a9f68afa",
        name: "walnuts",
    },
    {
        ingredientId: "1e3fac35-f6e6-4bd0-91c9-2ae11d168958",
        name: "wasabi",
    },
    {
        ingredientId: "a1f39f4b-c405-43be-a54a-3ed755041fbb",
        name: "watercress",
    },
    {
        ingredientId: "7660f12e-df84-4251-8d6b-74a0d8ea7e35",
        name: "wheat germ",
    },
    {
        ingredientId: "2d8bca0e-f161-4928-8f15-9106e16b737f",
        name: "whipped cream",
    },
    {
        ingredientId: "ff984883-e585-4419-95e5-02e362c827df",
        name: "whipping cream",
    },
    {
        ingredientId: "5c3319b8-83a1-41e3-aecc-042f5b2305b0",
        name: "white pepper",
    },
    {
        ingredientId: "e7e20bad-644f-4a12-ba64-8eb052eb4f6a",
        name: "white radish",
        namePlural: "white radishes",
    },
    {
        ingredientId: "f534bea6-124b-4d0d-897e-a0e94091e191",
        name: "white rice",
    },
    {
        ingredientId: "8180f137-255a-4df0-a182-cd5bfb11daba",
        name: "white vinegar",
    },
    {
        ingredientId: "1deb6204-1f9c-4a98-bf3a-1444919bb259",
        name: "white wine vinegar",
    },
    {
        ingredientId: "881b3166-a8cc-4545-9f0c-099eb6268379",
        name: "yeast",
    },
    {
        ingredientId: "44e51c4f-b944-480e-aee6-8614ef928464",
        name: "yellow squash",
    },
    {
        ingredientId: "c3346e2f-cc9c-4daf-b7dc-f3791aae8ed8",
        name: "yoghurt",
    },
    {
        ingredientId: "5ea55ca1-b182-47a2-b405-eb14ee7e634b",
        name: "yukon gold potato",
        namePlural: "yukon gold potatoes",
    },
    {
        ingredientId: "c45eacc2-8a3c-416f-9d38-0741dc00153c",
        name: "zucchini",
    },
] as const;

// Default tags
export const seed = async (knex: Knex): Promise<void> => {
    await knex("content")
        .insert(
            SYSTEM_INGREDIENTS.map(({ ingredientId }) => ({
                contentId: ingredientId,
            })),
        )
        .onConflict("contentId")
        .ignore();
    await knex("ingredient")
        .insert(SYSTEM_INGREDIENTS)
        .onConflict("ingredientId")
        .merge();
};
