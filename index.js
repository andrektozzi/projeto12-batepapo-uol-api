import express from 'express';
import cors from 'cors';

const app = express();
app.use(express.json());
app.use(cors());

app.post("/participants", (req, res) => {
    res.send("OK");
});

app.get("/participants", (req, res) => {
    res.send("OK");
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