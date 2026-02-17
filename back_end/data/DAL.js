const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = "mongodb+srv://zachmajernik_db_user:div08GzII37OFhg9@recipeapp-dev.g79enei.mongodb.net/?appName=recipeapp-dev";

let dal = {
    fetchAllRecipes: async function(){
        console.log("get all recipes from MongoDB");

        const client = new MongoClient(uri);
        let recipes = [];

        try{
            await client.connect();
            let db = client.db("recipeApp");
            let coll = db.collection("recipies");
            recipes = await coll.find().toArray();
            console.log(db)
            console.log(coll)
        }finally{
            await client.close();
        }

        console.log("Recipes: ", recipes);
        return recipes;
    }
};

exports.dal = dal;