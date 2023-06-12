const express = require("express");
const app = express();
require("dotenv").config();
const { MongoClient, ServerApiVersion } = require("mongodb");
const cors = require("cors");
const port = process.env.POST || 5000;

// MIDDLEWARE
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.fudiykq.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const classCollection = client.db("summerCamp").collection("classCollections");
    const userCollection = client.db("summerCamp").collection("userCollection");

    // users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = {email : user.email}
      const existing = await userCollection.findOne(query)
      if(existing){
        return res.send({message : 'already insert'})
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // class collection
    app.get("/classes", async (req, res) => {
      const query = { status: "approved" };
      const result = await classCollection.find(query).toArray();
      if (!result) {
        res.status(401).send({ error: true, message: "not found" });
      }
      res.send(result);
    });

    // popular class
    app.get('/polularClass', async(req, res)=>{
      const result = await classCollection.find().sort({ enrolled: -1 }).limit(6).toArray();
      if(!result){
        return res.send({message : 'data not found'})
      }
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("summer camp is running");
});

app.listen(port, () => {
  console.log(`summer camp is runnig on port : ${port}`);
});
