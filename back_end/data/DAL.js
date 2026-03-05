const { MongoClient, ObjectId, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://zachmajernik_db_user:div08GzII37OFhg9@recipeapp-dev.g79enei.mongodb.net/?appName=recipeapp-dev";

let dal = {
    fetchAllRecipes: async function(){
        console.log("get all recipes from MongoDB");

        const client = new MongoClient(uri);
        let recipes = [];

        try{
            await client.connect();
            console.log("Connected to MongoDB");
            let db = client.db("recipeApp");
            let coll = db.collection("recipes");
            recipes = await coll.find().toArray();
            console.log("Found " + recipes.length + " recipes");
            console.log("Recipes: ", recipes);
        }catch(error){
            console.error("Error fetching recipes: ", error);
        }finally{
            await client.close();
        }

        return recipes;
    },
    fetchAllSubmittedRecipes: async function(){
        console.log("get all submitted recipes from MongoDB");

        const client = new MongoClient(uri);
        let recipes = [];

        try{
            await client.connect();
            console.log("Connected to MongoDB");
            let db = client.db("recipeApp");
            let coll = db.collection("submitted_recipes");
            recipes = await coll.find().toArray();
            console.log("Found " + recipes.length + " submitted recipes");
            console.log("Submitted Recipes: ", recipes);
        }catch(error){
            console.error("Error fetching submitted recipes: ", error);
        }finally{
            await client.close();
        }

        return recipes;
    },
        fetchRecipeById: async function(id){
        console.log("Fetching recipe with id:", id); 
        const client = new MongoClient(uri);
        let recipe = null;
        try{
            await client.connect();
            let db = client.db("recipeApp");
            let coll = db.collection("recipes");
            recipe = await coll.findOne({ _id: new ObjectId(id) });
            console.log("Result:", recipe); 
        }catch(error){
            console.error("Error fetching recipe: ", error);
        }finally{
            await client.close();
        }
        return recipe;
    },
        fetchSubmittedRecipeById: async function(id){
        console.log("Fetching submitted recipe with id:", id); 
        const client = new MongoClient(uri);
        let recipe = null;
        try{
            await client.connect();
            let db = client.db("recipeApp");
            let coll = db.collection("submitted_recipes");
            recipe = await coll.findOne({ _id: new ObjectId(id) });
            console.log("Result:", recipe); 
        }catch(error){
            console.error("Error fetching submitted recipe: ", error);
        }finally{
            await client.close();
        }
        return recipe;
    },
    addCommentToRecipe: async function(id, comment) {
        // comment is expected to be an object with at least { text, username, userId, timestamp, rating }
        console.log("Adding comment to recipe", id, comment);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            // Push both the comment and the rating (as a number) to their respective arrays
            await coll.updateOne(
                { _id: new ObjectId(id) },
                {
                    $push: {
                        comments: comment
                    }
                }
            );
            console.log("Comment pushed");
        } catch (error) {
            console.error("Error adding comment: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    deleteCommentFromRecipe: async function(recipeId, commentIndex, userId, isAdmin) {
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const recipe =  await coll.findOne({ _id: new ObjectId(recipeId) });

            if (!recipe || !recipe.comments)
                throw new Error('Recipe not found');

            const comment = recipe.comments[commentIndex];
            if (!comment)
                throw new Error('Comment not found');
        if (!isAdmin && comment.userId !== userId)
            throw new Error('Unauthorized');
        recipe.comments.splice(commentIndex, 1);
        await coll.updateOne(
            { _id: new ObjectId(recipeId) },
            { $set: { comments: recipe.comments } 
        });
        } finally {
            await client.close();
        }
    },
    searchRecipes: async function(query) {
        console.log("Searching recipes with query:", query);
        const client = new MongoClient(uri);
        let results = [];
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            // Use a case-insensitive regex search on the name, ingredients, and tags fields
            results = await coll.find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { 'ingredients.item': { $regex: query, $options: 'i' } },
                    { tags: { $regex: query, $options: 'i' } }
                ]
            }).toArray();
            console.log("Search results:", results);
        }
        catch (error) {
            console.error("Error searching recipes: ", error);
        }
        finally {
            await client.close();
        }
        return results;
    },
    acceptSubmittedRecipe: async function(id) {
        console.log("Accepting submitted recipe with id:", id);
        const client = new MongoClient(uri);
        let recipe = await this.fetchSubmittedRecipeById(id);
        await this.deleteSubmittedRecipe(id);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const result = await coll.insertOne(recipe);
            console.log("Insert result:", result);
            return result.insertedId;
        } catch (error) {
            console.error("Error accepting submitted recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    addRecipe: async function(recipeData) {
        console.log("Adding new recipe:", recipeData);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const result = await coll.insertOne(recipeData);
            console.log("Insert result:", result);
            return result.insertedId;
        } catch (error) {
            console.error("Error adding recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    updateSubmittedRecipe: async function(id, updatedRecipe) {
        console.log("Updating submitted recipe:", id, updatedRecipe);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("submitted_recipes");
            const result = await coll.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedRecipe }
            );
            console.log("Update result:", result);
            return result.modifiedCount === 1;
        } catch (error) {
            console.error("Error updating submitted recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    updateRecipe: async function(id, updatedRecipe) {
        console.log("Updating recipe:", id, updatedRecipe);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const result = await coll.updateOne(
                { _id: new ObjectId(id) },
                { $set: updatedRecipe }
            );
            console.log("Update result:", result);
            return result.modifiedCount === 1;
        } catch (error) {
            console.error("Error updating recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    deleteRecipe: async function(id) {
        console.log("Deleting recipe with id:", id);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            const result = await coll.deleteOne({ _id: new ObjectId(id) });
            console.log("Delete result:", result);
            return result.deletedCount === 1;
        } catch (error) {
            console.error("Error deleting recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    deleteSubmittedRecipe: async function(id) {
        console.log("Deleting submitted recipe with id:", id);
        const client = new MongoClient(uri);
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("submitted_recipes");
            const result = await coll.deleteOne({ _id: new ObjectId(id) });
            console.log("Delete result:", result);
            return result.deletedCount === 1;
        } catch (error) {
            console.error("Error deleting submitted recipe: ", error);
            throw error;
        } finally {
            await client.close();
        }
    },
    searchRecipesByTag: async function(tag) {
        console.log("Searching recipes with tag:", tag);
        const client = new MongoClient(uri);
        let results = [];
        try {
            await client.connect();
            const db = client.db("recipeApp");
            const coll = db.collection("recipes");
            // Use a case-insensitive regex search on the tags field
            results = await coll.find({
                tags: { $regex: tag, $options: 'i' }
            }).toArray();
            console.log("Search results:", results);
        }
        catch (error) {
            console.error("Error searching recipes by tag: ", error);
        }
        finally {
            await client.close();
        }
        return results;
        }
};

exports.dal = dal;