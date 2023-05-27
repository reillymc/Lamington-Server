INSERT INTO user VALUES ("2a596f2e-d604-4a99-af8f-ffb370ca6286","test","Test","User","","2021-06-06 12:00:00","c");
INSERT INTO user VALUES ("4df86d9d-e2a4-4ca3-b895-6f325451b33c","sample","Sample","User","","2021-06-06 12:00:00","a");
INSERT INTO user VALUES ("3812f892-31d7-4ac8-bca0-5f5819b100cc","example","Example","User","","2021-06-06 12:00:00","a");

INSERT INTO tag VALUES ("bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5","Cusine","Recipe styles",NULL);
INSERT INTO tag VALUES ("7a2dc44b-1eac-4810-8a1c-322cb14ce5c8","Meal","Meal / course recipe is designed for",NULL);
INSERT INTO tag VALUES ("5508c6d9-49c7-462e-9e45-f6e6c78abe6c","Difficulty","Skill / time / effort required to cook recipe",NULL);
INSERT INTO tag VALUES ("038e3305-b679-4822-bc57-6e6fda8eb766","Dietary","Dietary requrements recipe caters to",NULL);
INSERT INTO tag VALUES ("e6167e53-7115-475d-ade0-6261e486f4ce","Cost","Price range to cook based on ingredients",NULL);
INSERT INTO tag VALUES ("6c46dcdf-1afe-4e29-9b4b-542306ae5a99","Measurement","Ingredient measurement units",NULL);
INSERT INTO tag VALUES ("xbcv4567-cbxv-fsad-kljw-4xcbv4174000","Italian",NULL,"bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5");
INSERT INTO tag VALUES ("dsfe4567-ghkf-sdf3-a456-32661417vcx0","Indian",NULL,"bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5");
INSERT INTO tag VALUES ("c5db7042-4aae-49fd-ae09-0e7514a2a369","Mexican",NULL,"bb5f54d1-47a6-4a6a-a6e8-6b2d8b37e7d5");
INSERT INTO tag VALUES ("24a49560-c7be-42b2-a3c3-a7d4b7ef9b24","Breakfast",NULL,"7a2dc44b-1eac-4810-8a1c-322cb14ce5c8");
INSERT INTO tag VALUES ("13aaec7b-70bd-4f9b-ac77-ffcea1e081cb","Lunch",NULL,"7a2dc44b-1eac-4810-8a1c-322cb14ce5c8");
INSERT INTO tag VALUES ("61ee0516-1987-4b6b-a59a-251cc07b2995","Dinner",NULL,"7a2dc44b-1eac-4810-8a1c-322cb14ce5c8");
INSERT INTO tag VALUES ("229e59f5-fb5d-462b-84b5-3c8184cb603b","Snack",NULL,"7a2dc44b-1eac-4810-8a1c-322cb14ce5c8");
INSERT INTO tag VALUES ("95a5cc8c-3f69-4652-9810-6597002899bd","Easy",NULL,"5508c6d9-49c7-462e-9e45-f6e6c78abe6c");
INSERT INTO tag VALUES ("ff629e93-cc6a-4dbf-bc5e-6969f89eed47","Medium",NULL,"5508c6d9-49c7-462e-9e45-f6e6c78abe6c");
INSERT INTO tag VALUES ("28b6995b-811f-44bb-af9f-768d078e010e","Hard",NULL,"5508c6d9-49c7-462e-9e45-f6e6c78abe6c");
INSERT INTO tag VALUES ("d8f703fe-b0b5-43f4-ae15-7ecce6bf03c5","Gluten free",NULL,"038e3305-b679-4822-bc57-6e6fda8eb766");
INSERT INTO tag VALUES ("570ac8b5-82f0-4fab-8b29-2c8b48c9e78b","Vegan",NULL,"038e3305-b679-4822-bc57-6e6fda8eb766");
INSERT INTO tag VALUES ("06158727-fc25-4d99-b356-7a36a07a8993","$","Budget","e6167e53-7115-475d-ade0-6261e486f4ce");
INSERT INTO tag VALUES ("46839022-4057-4722-b2c0-0f376b5ad2f9","$$","Mid-range","e6167e53-7115-475d-ade0-6261e486f4ce");
INSERT INTO tag VALUES ("c403667a-343f-4af0-9bbe-d8350afdb474","$$$","Expensive","e6167e53-7115-475d-ade0-6261e486f4ce");
INSERT INTO tag VALUES ("59d12a4d-f9f5-4939-bdcd-f581511e87bc","Tablespoon[|s]","Tbsp[|s]","6c46dcdf-1afe-4e29-9b4b-542306ae5a99");
INSERT INTO tag VALUES ("dcc05093-5e18-4d87-a238-a2160396a70e","Cup[|s]",NULL,"6c46dcdf-1afe-4e29-9b4b-542306ae5a99");
INSERT INTO tag VALUES ("3147336a-2903-4e63-b3a4-3d0b770acf52","Gram[|s]",NULL,"6c46dcdf-1afe-4e29-9b4b-542306ae5a99");

INSERT INTO ingredient VALUES ("bfe3893a-10aa-4428-bf2d-b98097a498ef","Spinach",NULL,NULL,"2a596f2e-d604-4a99-af8f-ffb370ca6286");
INSERT INTO ingredient VALUES ("708e6170-ebed-4ae7-8a09-56819b215a6b","Egg[|s]",NULL,NULL,"2a596f2e-d604-4a99-af8f-ffb370ca6286");
INSERT INTO ingredient VALUES ("a3434817-7850-4ecb-af41-a1d15297eaff","Ricotta cheese",NULL,NULL,"2a596f2e-d604-4a99-af8f-ffb370ca6286");
INSERT INTO ingredient VALUES ("a65207f9-34d7-4061-95d9-a0a2337720fc","Bay lea[f|ves]",NULL,NULL,"4df86d9d-e2a4-4ca3-b895-6f325451b33c");

INSERT INTO book VALUES ("5395c629-2251-4af5-90f0-8b0bd2b2ac73","2a596f2e-d604-4a99-af8f-ffb370ca6286","Test's Recipes","A basic cookbook");

INSERT INTO recipe VALUES ("f20be6f9-2911-4278-8be5-3b626643695c","Black Bean Echiladas","https://cookieandkate.com/vegetarian-enchiladas-recipe/","Be sure not to overcook spinach.","imgur:dhcyftq.jpg",4,30,45,1,"2a596f2e-d604-4a99-af8f-ffb370ca6286",2);
INSERT INTO recipe VALUES ("d5cd9212-9707-4c75-93f8-f2fb9cf5ef5f","Risotto-Stuffed Tomatoes","https://www.myrecipes.com/recipe/risotto-stuffed-tomatoes","Doubling not enough, triple or quadruple ideal.","imgur:gv8mr0c.jpg",4,60,30,0,"4df86d9d-e2a4-4ca3-b895-6f325451b33c",1);
INSERT INTO recipe VALUES ("8616873f-4632-4827-a06d-e6c46aeca825","Spinach and Ricotta Conchiglioni","https://www.jamieoliver.com/recipes/pasta-recipes/spinach-ricotta-cannelloni/","Always cook plenty of extra shells.","imgur:not1yhu.jpg",4,45,25,1,"2a596f2e-d604-4a99-af8f-ffb370ca6286",4);

INSERT INTO book_recipe VALUES ("5395c629-2251-4af5-90f0-8b0bd2b2ac73","8616873f-4632-4827-a06d-e6c46aeca825");

INSERT INTO recipe_rating VALUES ("8616873f-4632-4827-a06d-e6c46aeca825","2a596f2e-d604-4a99-af8f-ffb370ca6286",5);
INSERT INTO recipe_rating VALUES ("8616873f-4632-4827-a06d-e6c46aeca825","4df86d9d-e2a4-4ca3-b895-6f325451b33c",4);
INSERT INTO recipe_rating VALUES ("d5cd9212-9707-4c75-93f8-f2fb9cf5ef5f","2a596f2e-d604-4a99-af8f-ffb370ca6286",4);
INSERT INTO recipe_rating VALUES ("d5cd9212-9707-4c75-93f8-f2fb9cf5ef5f","3812f892-31d7-4ac8-bca0-5f5819b100cc",1);

INSERT INTO recipe_tag VALUES ("8616873f-4632-4827-a06d-e6c46aeca825","xbcv4567-cbxv-fsad-kljw-4xcbv4174000");
INSERT INTO recipe_tag VALUES ("f20be6f9-2911-4278-8be5-3b626643695c","13aaec7b-70bd-4f9b-ac77-ffcea1e081cb");
INSERT INTO recipe_tag VALUES ("f20be6f9-2911-4278-8be5-3b626643695c","ff629e93-cc6a-4dbf-bc5e-6969f89eed47");
INSERT INTO recipe_tag VALUES ("d5cd9212-9707-4c75-93f8-f2fb9cf5ef5f","c5db7042-4aae-49fd-ae09-0e7514a2a369");
INSERT INTO recipe_tag VALUES ("d5cd9212-9707-4c75-93f8-f2fb9cf5ef5f","d8f703fe-b0b5-43f4-ae15-7ecce6bf03c5");

INSERT INTO recipe_section VALUES ("8616873f-4632-4827-a06d-e6c46aeca825","default",1,"default","null");

INSERT INTO recipe_ingredient VALUES ("1f07e33c-8ee6-492f-96d2-32f79e375abe","8616873f-4632-4827-a06d-e6c46aeca825","default","bfe3893a-10aa-4428-bf2d-b98097a498ef",NULL,1,"dcc05093-5e18-4d87-a238-a2160396a70e",2,NULL,"packed");
INSERT INTO recipe_ingredient VALUES ("f6b4d75a-f399-4248-b5c3-c5555db25ad9","8616873f-4632-4827-a06d-e6c46aeca825","default","a3434817-7850-4ecb-af41-a1d15297eaff",NULL,2,"3147336a-2903-4e63-b3a4-3d0b770acf52",375,NULL,NULL);
INSERT INTO recipe_ingredient VALUES ("df2a10f1-3a74-41b9-939b-e2acae5dcb09","8616873f-4632-4827-a06d-e6c46aeca825","default","708e6170-ebed-4ae7-8a09-56819b215a6b",NULL,3,NULL,1,NULL,NULL);

INSERT INTO recipe_step VALUES ("3c8b73ad-fba4-4440-a504-45bff05142a0","8616873f-4632-4827-a06d-e6c46aeca825","default",1,"Mix ricotta and spinach together.",NULL);
INSERT INTO recipe_step VALUES ("6a5aab0b-64da-4cd2-927e-fc3c8b4abc9e","8616873f-4632-4827-a06d-e6c46aeca825","default",2,"Bake covered for 40 minutes.",NULL);

INSERT INTO list VALUES ("4dc89d42-1caa-41a5-b099-dae9e6a0099a","My Shopping List","2a596f2e-d604-4a99-af8f-ffb370ca6286","A simple list of things to buy");

INSERT INTO list_item VALUES ("7ff3691c-18b2-47c7-96fb-7981efeac522","4dc89d42-1caa-41a5-b099-dae9e6a0099a",0,"Capsicum","2022-09-24 05:00:00",0,NULL,NULL,NULL,NULL,"2a596f2e-d604-4a99-af8f-ffb370ca6286");

INSERT INTO list_member VALUES ("4dc89d42-1caa-41a5-b099-dae9e6a0099a","4df86d9d-e2a4-4ca3-b895-6f325451b33c",0,0); 

INSERT INTO planner VALUES("c164d64d-dc53-4147-a319-92a476f04b19", "2a596f2e-d604-4a99-af8f-ffb370ca6286", "Test's planner", "variant1", "");

INSERT INTO planner_member VALUES ("c164d64d-dc53-4147-a319-92a476f04b19","4df86d9d-e2a4-4ca3-b895-6f325451b33c",0,0); 

INSERT INTO planner_meal VALUES ("f30a54b0-fbfe-4673-b12b-ec13638d858c","c164d64d-dc53-4147-a319-92a476f04b19", "2a596f2e-d604-4a99-af8f-ffb370ca6286", 2023, 3, 26, "dinner", "", "8616873f-4632-4827-a06d-e6c46aeca825"); 
