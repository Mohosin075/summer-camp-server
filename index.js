const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.POST || 5000

// MIDDLEWARE
app.use(cors())
app.use(express.json())

app.get('/', (req, res)=>{
    res.send('summer camp is running')
})


app.listen(port, ()=>{
    console.log(`summer camp is runnig on port : ${port}`);
})