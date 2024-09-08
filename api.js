const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const app = express();

app.use(bodyParser.json());

const port = process.env.PORT || 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

// Chave secreta para assinar os tokens JWT
const secretKey = 'P@%+~~=0[2YW59l@M+5ctb-;|Y4{z;1om1CuyN#n0t)pm0/yEC0"dn`wvg92D7A';

// Endpoint para login do usuário
// Dados do body da requisição: {"username" : "user", "password" : "123456"}
// Verifique mais abaixo, no array users, os dados dos usuários existentes na app
app.post('/api/auth/login', (req, res) => {
  const credentials = req.body;

  let userData;
  userData = doLogin(credentials);

  if (userData) {
    // Cria o token JWT que será usado como session id
    const token = jwt.sign({ usuario_id: userData.id }, secretKey, { expiresIn: '1h' });
    res.json({ sessionid: token });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

// Endpoint para demonstração do processo de quebra da criptografia da session-id gerada no login
// Esse endpoint, e consequente processo, não deve estar presente em uma API oficial,
// aparecendo aqui apenas para finalidade de estudos.
app.post('/api/auth/decrypt/:sessionid', (req, res) => {
  const sessionid = req.params.sessionid;
  //const decryptedSessionid = decryptData(sessionid);
  const decryptedSessionid = decrypt(sessionid);
  
  res.json({ decryptedSessionid: decryptedSessionid })
});

// Endpoint para recuperação dos dados de todos os usuários cadastrados
app.get('/api/users/:sessionid', (req, res) => {
  const sessionid = req.params.sessionid;
  try {
    const decoded = jwt.verify(sessionid, secretKey);
    const perfil = getPerfil(decoded.usuario_id);

    if (perfil !== 'admin') {
      res.status(403).json({ message: 'Forbidden' });
    } else {
      res.status(200).json({ data: users });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid session id' });
  }
});

// Endpoint para recuperação dos contratos existentes
app.get('/api/contracts/:empresa/:inicio/:sessionid', (req, res) => {
  const empresa = req.params.empresa;
  const dtInicio = req.params.inicio;
  const sessionid = req.params.sessionid;

  try {
    const decoded = jwt.verify(sessionid, secretKey);
    const result = getContracts(empresa, dtInicio);
    if (result) {
      res.status(200).json({ data: result });
    } else {
      res.status(404).json({ data: 'Dados Não encontrados' });
    }
  } catch (error) {
    res.status(401).json({ message: 'Invalid session id' });
  }
});

// Outros endpoints da API

// ...

///////////////////////////////////////////////////////////////////////////////////
///

// Mock de dados

const users = [
  { "username": "user", "password": "123456", "id": 123, "email": "user@dominio.com", "perfil": "user" },
  { "username": "admin", "password": "123456789", "id": 124, "email": "admin@dominio.com", "perfil": "admin" },
  { "username": "colab", "password": "123", "id": 125, "email": "colab@dominio.com", "perfil": "user" },
];

// APP SERVICES
function doLogin(credentials) {
  let userData;
  userData = users.find(item => {
    if (credentials?.username === item.username && credentials?.password === item.password)
      return item;
  });
  return userData;
}

// Função de exemplo para demonstrar como é possível realizar a quebra da chave gerada (e usada como session id),
//   tendo acesso ao algoritmo e à palavra-chave usadas na encriptação.
function decrypt(encryptedText) {
  const decipher = crypto.createDecipher('aes-256-cbc', secretKey);
  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
};

// Recupera o perfil do usuário através do id
function getPerfil(userId) {
  const userData = users.find(item => {
    if (parseInt(userId) === parseInt(item.id))
      return item;
  });
  return userData.perfil;
}

// Classe fake emulando um script externo, responsável pela execução de queries no banco de dados
class Repository {
  execute(query) {
    return [];
  }
}

// Recupera, no banco de dados, os dados dos contratos
// Metodo não funcional, servindo apenas para fins de estudo
function getContracts(empresa, inicio) {
  const repository = new Repository();
  const query = `Select * from contracts Where empresa = '${empresa}' And data_inicio = '${inicio}'`;

  const result = repository.execute(query);

  return result;
}