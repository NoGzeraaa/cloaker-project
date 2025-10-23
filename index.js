import express from "express";
const app = express();

// Página principal
app.get("/", (req, res) => {
  res.send("Cloaker funcionando 🚀");
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log("Rodando na porta " + port));
