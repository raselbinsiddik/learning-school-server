const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;

// middlewere
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('class is start now')
})

app.listen(port, () => {
    console.log(`huury up on port ${port}`);
})