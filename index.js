import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import { MongoClient } from "mongodb";


import router from "./routes/router.js";


const app = express();


app.use(cors());
app.use(express.json());


dotenv.config();


const PORT = process.env.PORT || 8080;



const uri = process.env.MONGO_URL;
const dbName = 'RQ_Analytics';


MongoClient.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true }).then((client) => {

    const db = client.db(dbName);
    app.locals.db = db;

    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    })

}).catch((error) => {
    console.log(error);
})



app.use("/", router);






