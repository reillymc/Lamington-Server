-- MySQL Workbench Forward Engineering
SET @OLD_UNIQUE_CHECKS = @@UNIQUE_CHECKS,
  UNIQUE_CHECKS = 0;

SET @OLD_FOREIGN_KEY_CHECKS = @@FOREIGN_KEY_CHECKS,
  FOREIGN_KEY_CHECKS = 0;

SET @OLD_SQL_MODE = @@SQL_MODE,
  SQL_MODE = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema lamingtondb
-- -----------------------------------------------------
DROP SCHEMA IF EXISTS `lamingtondb`;

-- -----------------------------------------------------
-- Schema lamingtondb
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `lamingtondb`;

USE `lamingtondb`;

-- -----------------------------------------------------
-- Table `lamingtondb`.`user`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`user`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`user` (
  `userId` CHAR(36) NOT NULL,
  `email` VARCHAR(48) NOT NULL,
  `firstName` VARCHAR(48) NOT NULL,
  `lastName` VARCHAR(48) NOT NULL,
  `password` VARCHAR(60) NOT NULL,
  `dateCreated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` CHAR(1) NOT NULL,
  `preferences` JSON NULL,
  PRIMARY KEY (`userId`, `email`),
  UNIQUE INDEX `email_UNIQUE` (`email` ASC)
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe` (
  `recipeId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `source` VARCHAR(255) NULL,
  `summary` TEXT NULL,
  `tips` TEXT NULL,
  `photo` VARCHAR(255) NULL,
  `servingsLower` INT NULL,
  `servingsUpper` INT NULL,
  `prepTime` INT NULL,
  `cookTime` INT NULL,
  `public` TINYINT NULL DEFAULT 0,
  `createdBy` CHAR(36) NULL,
  `timesCooked` INT NULL DEFAULT 0,
  `dateUpdated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `dateCreated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`recipeId`),
  INDEX `fk-meals-created_by_idx` (`createdBy` ASC),
  CONSTRAINT `fk-meal-created_by` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE
  SET NULL ON UPDATE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe_rating`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe_rating`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe_rating` (
  `recipeId` CHAR(36) NOT NULL,
  `raterId` CHAR(36) NOT NULL,
  `rating` INT NOT NULL,
  PRIMARY KEY (`recipeId`, `raterId`),
  INDEX `fk-meal_ratings-rater_id_idx` (`raterId` ASC),
  CONSTRAINT `fk-meal_rating-meal_id` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk-meal_rating-rater_id` FOREIGN KEY (`raterId`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`tag`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`tag`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`tag` (
  `tagId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NULL,
  `parentId` CHAR(36) NULL,
  PRIMARY KEY (`tagId`),
  INDEX `fk_tag_1_idx` (`parentId` ASC),
  CONSTRAINT `fk_tag_1` FOREIGN KEY (`parentId`) REFERENCES `lamingtondb`.`tag` (`tagId`) ON DELETE CASCADE ON UPDATE NO ACTION
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe_tag`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe_tag`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe_tag` (
  `recipeId` CHAR(36) NOT NULL,
  `tagId` CHAR(36) NOT NULL,
  PRIMARY KEY (`recipeId`, `tagId`),
  INDEX `fk-meal_ratings-category_id_idx` (`tagId` ASC),
  CONSTRAINT `fk-meal_category-meal_id` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk-meal_category-category_id` FOREIGN KEY (`tagId`) REFERENCES `lamingtondb`.`tag` (`tagId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`ingredient`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`ingredient`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`ingredient` (
  `ingredientId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `description` VARCHAR(255) NULL,
  `photo` VARCHAR(255) NULL,
  `createdBy` CHAR(36) NULL,
  PRIMARY KEY (`ingredientId`),
  UNIQUE INDEX `name_UNIQUE` (`name` ASC),
  INDEX `fk_ingredient_1_idx` (`createdBy` ASC),
  CONSTRAINT `fk_ingredient_createdBy` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe_section`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe_section`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe_section` (
  `recipeId` CHAR(36) NOT NULL,
  `sectionId` CHAR(36) NOT NULL,
  `index` INT NOT NULL,
  `name` VARCHAR(255) NULL,
  `description` VARCHAR(255) NULL,
  INDEX `fd2_idx` (`recipeId` ASC),
  PRIMARY KEY (`recipeId`, `sectionId`),
  INDEX `section-id_idx` (`sectionId` ASC),
  CONSTRAINT `fk-meal_section-meal_id` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe_ingredient`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe_ingredient`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe_ingredient` (
  `id` CHAR(36) NOT NULL,
  `recipeId` CHAR(36) NOT NULL,
  `sectionId` CHAR(36) NOT NULL,
  `ingredientId` CHAR(36) NULL,
  `subrecipeId` CHAR(36) NULL,
  `index` INT NULL,
  `unit` VARCHAR(255) NULL,
  `amount` JSON NULL,
  `multiplier` SMALLINT NULL,
  `description` VARCHAR(255) NULL,
  INDEX `fk-meal_ingredients-meal_id_idx` (`recipeId` ASC),
  INDEX `fk-meal_ingredients-ingredient_id_idx` (`ingredientId` ASC),
  PRIMARY KEY (`id`),
  INDEX `fk_meal_ingredient_section-id_idx` (`sectionId` ASC),
  INDEX `fk_meal_ingredient_recipe_id_idx` (`subrecipeId` ASC),
  CONSTRAINT `fk-meal_ingredient-meal_id` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk-meal_ingredient-ingredient_id` FOREIGN KEY (`ingredientId`) REFERENCES `lamingtondb`.`ingredient` (`ingredientId`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `fk_meal_ingredient-meal_section` FOREIGN KEY (`sectionId`) REFERENCES `lamingtondb`.`recipe_section` (`sectionId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_meal_ingredient_recipe_id` FOREIGN KEY (`subrecipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE
  SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`recipe_step`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`recipe_step`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`recipe_step` (
  `id` CHAR(36) NOT NULL,
  `recipeId` CHAR(36) NOT NULL,
  `sectionId` CHAR(36) NULL,
  `index` INT NOT NULL,
  `description` TEXT NULL,
  `photo` VARCHAR(255) NULL,
  INDEX `fk-meal_step-meal_id_idx` (`recipeId` ASC),
  PRIMARY KEY (`id`),
  INDEX `fk_meal_step-section-id_idx` (`sectionId` ASC),
  CONSTRAINT `fk-meal_step-meal_id` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_meal_step-section_id` FOREIGN KEY (`sectionId`) REFERENCES `lamingtondb`.`recipe_section` (`sectionId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`list`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`list`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`list` (
  `listId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `createdBy` CHAR(36) NOT NULL,
  `customisations` JSON NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`listId`),
  INDEX `fk_list_created_by_idx` (`createdBy` ASC),
  CONSTRAINT `fk_list_created_by` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`list_item`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`list_item`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`list_item` (
  `itemId` CHAR(36) NOT NULL,
  `listId` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `dateUpdated` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `completed` TINYINT NOT NULL DEFAULT 0,
  `ingredientId` CHAR(36) NULL,
  `unit` VARCHAR(45) NULL,
  `amount` JSON NULL,
  `notes` VARCHAR(255) NULL,
  `createdBy` CHAR(36) NOT NULL,
  PRIMARY KEY (`itemId`),
  INDEX `fk_list_item_list_id_idx` (`listId` ASC),
  INDEX `fk_list_item_ingredient_id_idx` (`ingredientId` ASC),
  INDEX `fk_list_item_1_idx` (`createdBy` ASC),
  CONSTRAINT `fk_list_item_list_id` FOREIGN KEY (`listId`) REFERENCES `lamingtondb`.`list` (`listId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_list_item_ingredient_id` FOREIGN KEY (`ingredientId`) REFERENCES `lamingtondb`.`ingredient` (`ingredientId`) ON DELETE NO ACTION ON UPDATE CASCADE,
  CONSTRAINT `fk_list_item_1` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`list_member`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`list_member`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`list_member` (
  `listId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `canEdit` TINYINT NOT NULL DEFAULT 0,
  `accepted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`listId`, `userId`),
  INDEX `fk_list_member_userId_idx` (`userId` ASC),
  CONSTRAINT `fk_list_member_userId` FOREIGN KEY (`userId`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_list_member_listId` FOREIGN KEY (`listId`) REFERENCES `lamingtondb`.`list` (`listId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`book`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`book`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`book` (
  `bookId` CHAR(36) NOT NULL,
  `createdBy` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NULL,
  `customisations` JSON NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`bookId`),
  INDEX `fk_book_createdBy_user_idx` (`createdBy` ASC),
  CONSTRAINT `fk_book_createdBy_user` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`book_recipe`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`book_recipe`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`book_recipe` (
  `bookId` CHAR(36) NOT NULL,
  `recipeId` CHAR(36) NOT NULL,
  PRIMARY KEY (`bookId`, `recipeId`),
  INDEX `fk_book_meal_2_idx` (`recipeId` ASC),
  CONSTRAINT `fk_book_meal_1` FOREIGN KEY (`bookId`) REFERENCES `lamingtondb`.`book` (`bookId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_book_meal_2` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`book_member`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`book_member`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`book_member` (
  `bookId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `canEdit` TINYINT NOT NULL DEFAULT 0,
  `accepted` TINYINT NOT NULL DEFAULT 0,
  PRIMARY KEY (`bookId`, `userId`),
  INDEX `fk_list_member_userId_idx` (`userId` ASC),
  CONSTRAINT `fk_book_member_userId` FOREIGN KEY (`userId`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_book_member_bookId` FOREIGN KEY (`bookId`) REFERENCES `lamingtondb`.`book` (`bookId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`planner`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`planner`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`planner` (
  `plannerId` CHAR(36) NOT NULL,
  `createdBy` CHAR(36) NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `customisations` JSON NULL,
  `description` VARCHAR(255) NULL,
  PRIMARY KEY (`plannerId`),
  INDEX `fk_planner_createdBy_user_idx` (`createdBy` ASC),
  CONSTRAINT `fk_planner_createdBy_user` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`planner_meal`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`planner_meal`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`planner_meal` (
  `id` CHAR(36) NOT NULL,
  `plannerId` CHAR(36) NULL,
  `createdBy` CHAR(36) NOT NULL,
  `year` INT(5) NULL,
  `month` INT(2) NULL,
  `dayOfMonth` INT(2) NULL,
  `meal` VARCHAR(45) NOT NULL,
  `description` VARCHAR(255) NULL,
  `source` VARCHAR(255) NULL,
  `sequence` INT(3) NULL,
  `recipeId` CHAR(36) NULL,
  PRIMARY KEY (`id`),
  INDEX `fk_planner_meal_1_idx` (`plannerId` ASC),
  INDEX `fk_planner_meal_2_idx` (`createdBy` ASC),
  INDEX `fk_planner_meal_3_idx` (`recipeId` ASC),
  CONSTRAINT `fk_planner_meal_1` FOREIGN KEY (`plannerId`) REFERENCES `lamingtondb`.`planner` (`plannerId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_planner_meal_2` FOREIGN KEY (`createdBy`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_planner_meal_3` FOREIGN KEY (`recipeId`) REFERENCES `lamingtondb`.`recipe` (`recipeId`) ON DELETE
  SET NULL ON UPDATE
  SET NULL
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

-- -----------------------------------------------------
-- Table `lamingtondb`.`planner_member`
-- -----------------------------------------------------
DROP TABLE IF EXISTS `lamingtondb`.`planner_member`;

CREATE TABLE IF NOT EXISTS `lamingtondb`.`planner_member` (
  `plannerId` CHAR(36) NOT NULL,
  `userId` CHAR(36) NOT NULL,
  `accepted` INT(1) NOT NULL DEFAULT 0,
  `canEdit` INT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (`plannerId`, `userId`),
  INDEX `fk_planner_member_2_idx` (`userId` ASC),
  CONSTRAINT `fk_planner_member_planner` FOREIGN KEY (`plannerId`) REFERENCES `lamingtondb`.`planner` (`plannerId`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_planner_member_user` FOREIGN KEY (`userId`) REFERENCES `lamingtondb`.`user` (`userId`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB DEFAULT CHARACTER SET = utf8mb4;

SET SQL_MODE = @OLD_SQL_MODE;

SET FOREIGN_KEY_CHECKS = @OLD_FOREIGN_KEY_CHECKS;

SET UNIQUE_CHECKS = @OLD_UNIQUE_CHECKS;
