import express, { json } from 'express';
import cors from 'cors';
import dayjs from 'dayjs';
import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

const mongoClient = new MongoClient(process.env.MONGO_URI);
let db;

mongoClient.connect().then(() => {
    db = mongoClient.db("bate-papo-uol");
})


app.post("/participants", (req, res) => {
    const { name } = req.body

    if(!name) return res.sendStatus(422);

    const find = db.collection("participants").findOne({name: name});
    find.then(participant => {
        if(!participant){
            const insert = db.collection("participants").insertOne({
                name: name,
                lastStatus: Date.now()
            });
            insert.then(() => {
                const message = db.collection("messages").insertOne({
                    from: name,
                    to: 'Todos',
                    text: 'entra na sala...',
                    type: 'status',
                    time: dayjs().format('HH:MM:SS')
                });
                message.then(() => res.sendStatus(201));
            });
        } else return res.sendStatus(409);
    });
});

app.get("/participants", (req, res) => {
    const promise = db.collection("participants").find({}).toArray();
    promise.then(participants => res.send(participants));
});

app.post("/messages", (req, res) => {
    res.send("OK");
});

app.get("/messages", (req, res) => {
    res.send("OK");
});

app.post("/status", (req, res) => {
    res.send("OK");
});


app.listen(5000);