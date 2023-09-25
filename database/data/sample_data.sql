INSERT INTO `user`
VALUES (
        '2a596f2e-d604-4a99-af8f-ffb370ca6286',
        'test',
        'Alice',
        'T. Lamington',
        '',
        '2021-06-06 12:00:00',
        'R',
        '{}'
    ),
    (
        '3812f892-31d7-4ac8-bca0-5f5819b100cc',
        'example',
        'Tim',
        'E. Lamington',
        '',
        '2021-06-06 12:00:00',
        'R',
        '{}'
    ),
    (
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c',
        'sample',
        'Brian',
        'S. Lamington',
        '',
        '2021-06-06 12:00:00',
        'A',
        '{}'
    ),
    (
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        'demo',
        'Chef',
        'D. Lamington',
        '',
        '2023-05-20 06:23:10',
        'R',
        '{}'
    );

INSERT INTO `tag`
VALUES (
        '038e3305-b679-4822-bc57-6e6fda8eb766',
        'Dietary',
        'Dietary requirements recipe caters to',
        NULL
    ),
    (
        'd58e5bf0-2fe7-4356-a9fa-17a6feec5764',
        'Vegetarian',
        NULL,
        '038e3305-b679-4822-bc57-6e6fda8eb766'
    ),
    (
        '570ac8b5-82f0-4fab-8b29-2c8b48c9e78b',
        'Vegan',
        NULL,
        '038e3305-b679-4822-bc57-6e6fda8eb766'
    ),
    (
        'd8f703fe-b0b5-43f4-ae15-7ecce6bf03c5',
        'Gluten free',
        NULL,
        '038e3305-b679-4822-bc57-6e6fda8eb766'
    ),
    (
        '0656cd4b-ebdf-4217-b113-3590b3df1077',
        'Dairy free',
        NULL,
        '038e3305-b679-4822-bc57-6e6fda8eb766'
    ),
    (
        '5508c6d9-49c7-462e-9e45-f6e6c78abe6c',
        'Difficulty',
        'Skill / time / effort required to cook recipe',
        NULL
    ),
    (
        '28b6995b-811f-44bb-af9f-768d078e010e',
        'Hard',
        NULL,
        '5508c6d9-49c7-462e-9e45-f6e6c78abe6c'
    ),
    (
        '95a5cc8c-3f69-4652-9810-6597002899bd',
        'Easy',
        NULL,
        '5508c6d9-49c7-462e-9e45-f6e6c78abe6c'
    ),
    (
        'ff629e93-cc6a-4dbf-bc5e-6969f89eed47',
        'Medium',
        NULL,
        '5508c6d9-49c7-462e-9e45-f6e6c78abe6c'
    ),
    (
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8',
        'Meal',
        'Meal / course recipe is designed for',
        NULL
    ),
    (
        '61ee0516-1987-4b6b-a59a-251cc07b2995',
        'Dinner',
        NULL,
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        '13aaec7b-70bd-4f9b-ac77-ffcea1e081cb',
        'Lunch',
        NULL,
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        '229e59f5-fb5d-462b-84b5-3c8184cb603b',
        'Snack',
        NULL,
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        '24a49560-c7be-42b2-a3c3-a7d4b7ef9b24',
        'Breakfast',
        NULL,
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        '4a021129-6fe1-48a9-ae53-014a16a8fe74',
        'Dessert',
        NULL,
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        '2f6fb407-9914-4636-9ed4-2fe7259130f6',
        'Preparation',
        'A sub-recipe / component used in other recipes',
        '7a2dc44b-1eac-4810-8a1c-322cb14ce5c8'
    ),
    (
        'bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5',
        'Cusine',
        'Recipe styles',
        NULL
    ),
    (
        'c5db7042-4aae-49fd-ae09-0e7514a2a369',
        'Mexican',
        NULL,
        'bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5'
    ),
    (
        'dsfe4567-ghkf-sdf3-a456-32661417vcx0',
        'Indian',
        NULL,
        'bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5'
    ),
    (
        'xbcv4567-cbxv-fsad-kljw-4xcbv4174000',
        'Italian',
        NULL,
        'bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5'
    ),
    (
        'e6167e53-7115-475d-ade0-6261e486f4ce',
        'Cost',
        'Price range to cook based on ingredients',
        NULL
    ),
    (
        '06158727-fc25-4d99-b356-7a36a07a8993',
        '$',
        'Budget',
        'e6167e53-7115-475d-ade0-6261e486f4ce'
    ),
    (
        '46839022-4057-4722-b2c0-0f376b5ad2f9',
        '$$',
        'Mid-range',
        'e6167e53-7115-475d-ade0-6261e486f4ce'
    ),
    (
        'c403667a-343f-4af0-9bbe-d8350afdb474',
        '$$$',
        'Expensive',
        'e6167e53-7115-475d-ade0-6261e486f4ce'
    );

INSERT INTO `ingredient`
VALUES (
        '06ebabe3-b045-4560-9245-a77ee155defa',
        'Hello there',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '0ba54249-1f93-4c56-b788-05b91e81a3e5',
        'Capsicum',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        '0cb956ba-49e1-469e-a6b0-e193f0f4638b',
        'Pamdj',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        '0db5f4be-664b-4cae-9aad-36c386ba26d2',
        'Padding',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '13c4a101-4af6-4d28-af11-c7b8c173939c',
        'Heavy cream',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '209dcc17-4031-4ae3-af29-8a3416dadffd',
        'Bottle',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '21e5659d-0401-4d06-8764-c1c67185890c',
        'Diced tomatoes',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '33d722d7-a204-406f-9459-05cc1b085b8b',
        'Test',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '35380b9d-821e-4c47-b61c-0a9ea65ab36f',
        'Item',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '425adfcd-d25a-43e5-8d4d-03b013d1257e',
        'Garlic',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '4b1d35d0-bb53-4dc5-bab0-51a4e3106abc',
        'Another',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '4d65c912-b9a1-4f70-9e72-352c6ecb0a67',
        'Birch tree',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '4dc32711-a2b8-4f8d-8628-8c34f6d601f5',
        'Butter',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        '5fe947e0-3057-4fe3-b3e4-92aa5ee636fd',
        'Passata',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '708e6170-ebed-4ae7-8a09-56819b215a6b',
        'Egg[|s]',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '893496e9-4d6d-42cb-9518-a99623974038',
        'Potato Gnocchi',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '8f505a0c-c6b9-4f59-b76f-f6e8fc970a35',
        'Yeet',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        '977c7c24-0bc7-4537-a307-5cae4e50ab15',
        'Olive oil',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        'a31e677a-a6cc-495e-bc4a-6bbda8616bb5',
        'Ham',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'a3434817-7850-4ecb-af41-a1d15297eaff',
        'Ricotta cheese',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'a65207f9-34d7-4061-95d9-a0a2337720fc',
        'Bay lea[f|ves]',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'aaaa4dc0-3714-45ab-a12c-e7028b7782b7',
        'Pame',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'ad7f49e4-0069-43b3-bb0c-581a4920a69e',
        'Enna',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'ae8abdf4-63a1-46e6-bf65-302960e2faec',
        'Happy boy',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'b68f2bd8-d1f5-4ddf-ba53-5047b0db910a',
        'Aithern',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'bdfd6f19-3404-48ec-bee1-fb2adcff8a2f',
        'Sa dman',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'bfe3893a-10aa-4428-bf2d-b98097a498ef',
        'Spinach',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'cc4fd071-f293-4b3f-8507-76e7717ac2cd',
        'Risotto-Stuffed Tomatoes',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'd08e7584-55b5-4286-bfa4-6aa4ac8e923f',
        'Infent ',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'd4eb7a93-9fcf-4a73-9fa6-d5b75320fb67',
        'Wo am ih',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'dc59bb82-f009-4703-a6cd-d492846e5377',
        'Hello',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'e424dd24-e162-427c-aa27-2d607a3a9ad8',
        'Cheesy muffins',
        NULL,
        NULL,
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c'
    ),
    (
        'e4ecdda8-defd-4ce6-a537-786bdf24d602',
        'I am',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'f3d13e35-ba2c-411b-b662-8367606ef910',
        'Buy my own recipe!!',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    ),
    (
        'f3dda7b8-9690-4361-bcb7-7d27f20c8c8d',
        'Salt',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        'f9465043-3bfd-48b2-8d0a-ca7cab9a1050',
        'Help',
        NULL,
        NULL,
        '2a596f2e-d604-4a99-af8f-ffb370ca6286'
    );

INSERT INTO `book`
VALUES (
        '00ba8d00-7360-46dc-ba97-858d5bfee24b',
        '3812f892-31d7-4ac8-bca0-5f5819b100cc',
        'Example book',
        '{}',
        NULL
    ),
    (
        '4b1e6d4d-6095-4201-b803-4f6249f0ef6f',
        '2a596f2e-d604-4a99-af8f-ffb370ca6286',
        'Lunch Ideas',
        '{}',
        NULL
    ),
    (
        '5395c629-2251-4af5-90f0-8b0bd2b2ac73',
        '2a596f2e-d604-4a99-af8f-ffb370ca6286',
        'Testolinieousesb',
        '{}',
        'A basic cookbookie'
    ),
    (
        '566a1593-78fa-4d73-a40e-5359b14a8b85',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        'Healthy Dinners',
        '{}',
        'Tasty recipes that are good for you'
    ),
    (
        '58f62e77-3a63-41bf-8d6c-bd26bf1ccb5c',
        '3812f892-31d7-4ac8-bca0-5f5819b100cc',
        'My boo',
        '{}',
        NULL
    ),
    (
        '6e9e66ed-d39c-47f1-956b-f455e8f2e166',
        '4df86d9d-e2a4-4ca3-b895-6f325451b33c',
        'Yo',
        '{}',
        NULL
    ),
    (
        'b7a49a84-f39a-44b0-a8db-fc3d12a23a38',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        'Favourite Recipes',
        '{}',
        'My top recipes to cook'
    ),
    (
        'ddcb92f8-9a00-48d1-839d-b1080c9d0263',
        '2a596f2e-d604-4a99-af8f-ffb370ca6286',
        'Hoe',
        '{}',
        NULL
    ),
    (
        'f7d6f62e-7d1e-4b1a-a5a9-b24ed0fb4425',
        '3812f892-31d7-4ac8-bca0-5f5819b100cc',
        'Zeb',
        '{}',
        NULL
    );

INSERT INTO `recipe`
VALUES (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        'Gnocchi with Tomato Cream Sauce',
        NULL,
        NULL,
        NULL,
        'lamington:dev/839c1893-e03b-4479-85f2-138e4d42a2e8/recipe/02eab0b9-d8f2-4d64-bc76-cbac36e4c59f_0.jpg',
        '{"unit": "people", "count": {"representation": "number", "value": "4"}',
        20,
        30,
        0,
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        0,
        '2023-05-21 00:00:00',
        '2023-05-20 00:00:00'
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        'Black Bean Enchiladas',
        NULL,
        NULL,
        NULL,
        'lamington:dev/839c1893-e03b-4479-85f2-138e4d42a2e8/recipe/99656745-3325-4a47-9361-caba8849a4e2_0.jpg',
        '{"unit": "people", "count": {"representation": "number", "value": "3"}}',
        20,
        40,
        0,
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        0,
        '2023-06-25 00:00:00',
        '2023-05-10 00:00:00'
    );

INSERT INTO `book_recipe`
VALUES (
        'b7a49a84-f39a-44b0-a8db-fc3d12a23a38',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f'
    );

INSERT INTO `recipe_rating`
VALUES (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        4
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        4
    );

INSERT INTO `recipe_tag`
VALUES (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '46839022-4057-4722-b2c0-0f376b5ad2f9'
    ),
    (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '61ee0516-1987-4b6b-a59a-251cc07b2995'
    ),
    (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        'xbcv4567-cbxv-fsad-kljw-4xcbv4174000'
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        '06158727-fc25-4d99-b356-7a36a07a8993'
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        '61ee0516-1987-4b6b-a59a-251cc07b2995'
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        'c5db7042-4aae-49fd-ae09-0e7514a2a369'
    );

INSERT INTO `recipe_section`
VALUES (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        0,
        'default',
        NULL
    ),
    (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        1,
        'Cooking the Gnocchi',
        NULL
    ),
    (
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '6859b86b-def1-4779-a794-ac33cb9d180f',
        2,
        'Cooking the Sauce',
        NULL
    ),
    (
        '99656745-3325-4a47-9361-caba8849a4e2',
        'afb7090d-17d3-40b7-9c6e-f89388b23235',
        0,
        'default',
        NULL
    );

INSERT INTO `recipe_ingredient`
VALUES (
        '15fed8ab-3554-4a81-ad80-82f36eb3267e',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        'f3dda7b8-9690-4361-bcb7-7d27f20c8c8d',
        NULL,
        7,
        'tsp',
        '{"representation": "number", "value": "0.5"}',
        NULL,
        NULL
    ),
    (
        '18025e5b-cea2-493a-8794-6bf8645cf6e3',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '893496e9-4d6d-42cb-9518-a99623974038',
        NULL,
        0,
        'g',
        '{"representation": "number", "value": "500"}',
        NULL,
        NULL
    ),
    (
        '95de556a-57fd-4758-974e-73158288499c',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '4dc32711-a2b8-4f8d-8628-8c34f6d601f5',
        NULL,
        1,
        'tbsp',
        '{"representation": "number", "value": "2"}',
        NULL,
        NULL
    ),
    (
        '9b9e6ced-8917-46b1-a995-8d25601f7f10',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '5fe947e0-3057-4fe3-b3e4-92aa5ee636fd',
        NULL,
        5,
        'cup',
        '{"representation": "fraction", "value": ["","1","2"]}',
        NULL,
        NULL
    ),
    (
        'a82aaf64-522f-4a20-9eff-2d3306c29b56',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '13c4a101-4af6-4d28-af11-c7b8c173939c',
        NULL,
        6,
        'cup',
        '{"representation": "fraction", "value": ["","1","3"]}',
        NULL,
        NULL
    ),
    (
        'c7910620-fe7f-4d32-825f-73b7f3e42900',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '21e5659d-0401-4d06-8764-c1c67185890c',
        NULL,
        4,
        'g',
        '{"representation": "number", "value": "400"}',
        NULL,
        NULL
    ),
    (
        'f1692298-cb69-431c-baf2-99cb79090150',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '425adfcd-d25a-43e5-8d4d-03b013d1257e',
        NULL,
        3,
        'tsp',
        '{"representation": "number", "value": "3"}',
        NULL,
        NULL
    ),
    (
        'fe32282e-fa85-428a-b819-4f0ac6ffbb92',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '444b8e22-ed15-425f-accc-ba7a52082a30',
        '977c7c24-0bc7-4537-a307-5cae4e50ab15',
        NULL,
        2,
        'tsp',
        '{"representation": "number", "value": "3"}',
        NULL,
        NULL
    );

INSERT INTO `recipe_step`
VALUES (
        '04e951b8-23c0-49f6-9d90-f7c8fff1511f',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '6859b86b-def1-4779-a794-ac33cb9d180f',
        2,
        'Stir in the gnocchi. Garnish with basil and freshly grated parmesan cheese.',
        NULL
    ),
    (
        '2200de77-1d51-472f-b415-ebebbfdf2030',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        3,
        'Add gnocchi. Sauté 2-4 minutes until it begins to brown.',
        NULL
    ),
    (
        '2892b0fb-80d7-46d1-a0fa-3b700ce9911c',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        4,
        'Transfer gnocchi to a bowl and cover.',
        NULL
    ),
    (
        '43c93099-554f-415d-ae8c-fe0a1bf8a50a',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '6859b86b-def1-4779-a794-ac33cb9d180f',
        0,
        'Add tomatoes and tomato sauce to the skillet and bring to a simmer.',
        NULL
    ),
    (
        '7f468385-0081-4f5b-8a88-d0a4fc572f55',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '6859b86b-def1-4779-a794-ac33cb9d180f',
        1,
        'Stir in heavy cream and salt and pepper. Simmer for 4 to 5 minutes until sauce is reduced and creamy.',
        NULL
    ),
    (
        '91cd24fe-b65b-4fef-8b86-bcb51700d143',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        1,
        'Boil gnocchi for 2-3 minutes until it floats. Drain, then toss with 3 teaspoons olive oil.',
        NULL
    ),
    (
        'ee8c1fdc-0af6-462f-afbb-5c8e87883fd3',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        2,
        'Melt butter in a large skillet. Add garlic and sauté until fragrant.',
        NULL
    ),
    (
        'fd34ae8c-f83b-42b2-8894-cf4aefb6f802',
        '02eab0b9-d8f2-4d64-bc76-cbac36e4c59f',
        '50030d2b-2a01-4fbe-b725-2947831f35ac',
        0,
        'Fill a pot with about 3 inches of water and bring to a boil.',
        NULL
    );

INSERT INTO `list`
VALUES (
        '3f94889b-3125-4052-9dc1-7f41bb15971e',
        'Fruit and Vegetable Market',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        '{}',
        'Fresh produce'
    ),
    (
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'My Shopping List',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        '{}',
        'A list of all the items I need to buy'
    );

INSERT INTO `list_item`
VALUES (
        '01177fd7-89d9-44b6-a9f2-e79949451d04',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Onions',
        '2023-05-21 06:46:38',
        0,
        NULL,
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '0400a0ec-c7aa-4a4a-bd38-81a4db0fed87',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Garlic',
        '2023-05-21 06:46:31',
        0,
        NULL,
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '144ac6a8-38a4-4308-9cba-3f8e504bf38c',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Butter',
        '2023-05-21 06:48:38',
        0,
        '4dc32711-a2b8-4f8d-8628-8c34f6d601f5',
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '65ec0dce-d4c7-4147-b1c4-d17a591b7994',
        '3f94889b-3125-4052-9dc1-7f41bb15971e',
        'Spinach',
        '2023-05-21 06:51:16',
        0,
        'bfe3893a-10aa-4428-bf2d-b98097a498ef',
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        '76be7e77-afee-4e1d-866a-61e68ee09354',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Banana[|s]',
        '2023-05-21 06:48:14',
        0,
        NULL,
        'bunch',
        '{"representation": "number", "value": "2"}',
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        'a80b8f6f-e755-4c91-9050-68e081bf2ef7',
        '3f94889b-3125-4052-9dc1-7f41bb15971e',
        'Apples',
        '2023-05-21 06:51:23',
        0,
        NULL,
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        'bdf37677-b8ca-4f38-9ff0-3a1f557d371c',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Egg[|s]',
        '2023-05-21 06:46:16',
        0,
        '708e6170-ebed-4ae7-8a09-56819b215a6b',
        '',
        NULL,
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    ),
    (
        'cbaaaa0a-fcd8-42fe-8ac4-1cf995f90098',
        '517959f9-02d8-42a3-9dc9-5934f68561d0',
        'Flour',
        '2023-05-21 06:46:21',
        0,
        NULL,
        'g',
        '{"representation": "number", "value": "500"}',
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8'
    );

INSERT INTO `planner`
VALUES (
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        'My Meal Planner',
        '{}',
        'A planner for all the meals I want to cook'
    );

INSERT INTO `planner_meal`
VALUES (
        '02609a6a-4d94-44a2-9972-42723a089ceb',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        22,
        'lunch',
        'Lunch with Bob',
        NULL,
        NULL,
        NULL
    ),
    (
        '09ada2e6-ac60-4c6e-bfd2-f3809d446823',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        20,
        'lunch',
        'Salad',
        NULL,
        NULL,
        NULL
    ),
    (
        '34f7b97e-8117-495a-ba60-758a7e176df7',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        26,
        'breakfast',
        'Overnight Oats',
        NULL,
        NULL,
        NULL
    ),
    (
        '6d83889e-9d50-47b6-b847-19faaeaa6d45',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        26,
        'dinner',
        'Pizza',
        NULL,
        NULL,
        NULL
    ),
    (
        '73f98131-06c8-4b43-95cf-ed0c3ec2f3a1',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        27,
        'lunch',
        'Family Lunch',
        NULL,
        NULL,
        NULL
    ),
    (
        '92c7818f-5a27-48b4-b51c-1332d56337b9',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        22,
        'breakfast',
        'Scrambled Eggs ',
        NULL,
        NULL,
        NULL
    ),
    (
        '9eb78e40-76b6-4d94-a522-304339f41fdf',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        21,
        'dinner',
        'Barbecue ',
        NULL,
        NULL,
        NULL
    ),
    (
        'aab75e80-957a-4c6c-86c7-dd3d514b979b',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        23,
        'dinner',
        'Black Bean Enchiladas',
        NULL,
        NULL,
        '99656745-3325-4a47-9361-caba8849a4e2'
    ),
    (
        'ad7d8c9a-2809-4fab-a52c-695ebb54f80f',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        24,
        'breakfast',
        'Muesli ',
        NULL,
        NULL,
        NULL
    ),
    (
        'ba39cc7a-e3f7-4f3d-881a-16017a6c854e',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        27,
        'dinner',
        'Take-out',
        NULL,
        NULL,
        NULL
    ),
    (
        'bb2c76dd-926c-474c-be2e-c64b4f86d6d3',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        20,
        'breakfast',
        'Example meal with no recipe',
        NULL,
        NULL,
        NULL
    ),
    (
        'd1749d9e-1a6e-42f7-9292-bb9a1533d6ab',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        27,
        'breakfast',
        'Fruit Smoothie',
        NULL,
        NULL,
        NULL
    ),
    (
        'dbc179b9-9b4f-48c7-83cd-275af271b5d1',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        25,
        'dinner',
        'Risotto-Stuffed Tomatoes',
        NULL,
        NULL,
        NULL
    ),
    (
        'e48d5add-3da4-4c8d-98b6-3a74391512bc',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        25,
        'breakfast',
        'Muesli ',
        NULL,
        NULL,
        NULL
    ),
    (
        'e7aaf2b9-631b-4b07-b624-ccd0b479ed7b',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        23,
        'breakfast',
        'Fruit Smoothie',
        NULL,
        NULL,
        NULL
    ),
    (
        'eec01654-1a29-48de-bdac-70b0267f9087',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        22,
        'dinner',
        'Black Bean Enchiladas',
        NULL,
        NULL,
        '99656745-3325-4a47-9361-caba8849a4e2'
    ),
    (
        'f4795472-90cc-493b-af99-523a23bcff3c',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        24,
        'dinner',
        'Risotto-Stuffed Tomatoes',
        NULL,
        NULL,
        NULL
    ),
    (
        'f65ebeef-a0bc-4d27-b865-caf3c6fb8023',
        'eabedc0b-8b45-4432-9ddd-4b9855cb06ce',
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        2023,
        4,
        21,
        'breakfast',
        'Overnight Oats',
        NULL,
        NULL,
        NULL
    ),
    (
        '2e15c937-b0ab-499e-929d-700bcc248404',
        NULL,
        '839c1893-e03b-4479-85f2-138e4d42a2e8',
        NULL,
        NULL,
        NULL,
        'breakfast',
        'Pancakes',
        'www.google.com',
        1,
        NULL
    );
