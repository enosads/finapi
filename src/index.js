const express = require('express');
const {v4: uuidv4} = require("uuid")

const app = express();
app.use(express.json());
// app.use(verifyIfExistsAccountCPF);

const customers = [];

//Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const {cpf} = request.headers;

  const customer = customers.find((customer) => customer.cpf === cpf);
  if (!customer) {
    return response.status(400).json({error: "Customer not found"})
  }

  request.customer = customer;
  return next();
}

function getBalance(statement) {
  return statement.reduce((balance, statement) => {
    return statement.type === 'credit' ?
      balance + statement.amount :
      balance - statement.amount
  }, 0);
}

app.post('/account', function (request, response) {
  const {cpf, name} = request.body;

  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400)
      .json({error: "Customer already exists"});
  }
  customers.push({
    id: uuidv4(),
    cpf,
    name,
    statement: []
  });
  return response.status(201).send();
});

app.get('/statement', verifyIfExistsAccountCPF, function (request, response) {
  return response.json(request.customer.statement);
});

app.post('/deposit', verifyIfExistsAccountCPF, function (request, response) {
  const {description, amount} = request.body;

  const {customer} = request;

  const statementOperation = {
    description,
    amount,
    createdAt: new Date(),
    type: 'credit'
  }
  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post('/withdraw', verifyIfExistsAccountCPF, function (request, response) {
  const {amount} = request.body;
  const {customer} = request;
  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({error: 'Insufficient funds!'});
  }

  const statementOperation = {
    amount,
    createdAt: new Date(),
    type: 'debit',
  }

  customer.statement.push(statementOperation);

  return response.status(201).send();
});


app.get('/statement/date', verifyIfExistsAccountCPF, function (request, response) {
  const {customer} = request;
  const {date} = request.query;
  const dateFormat = new Date(date + " 00:00");
  const statements = customer.statement.filter(
    (statement) => statement.createdAt.toDateString() === new Date(dateFormat).toDateString()
  );
  return response.json(statements);
});

app.put('/account', verifyIfExistsAccountCPF, (request, response) => {
  const {name} = request.body;
  const {customer} = request;
  customer.name = name;
  return response.send();
});

app.get('/account', verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request;
  return response.json(customer);
});

app.delete('/account', verifyIfExistsAccountCPF, (request, response) => {
  const {customer} = request;
  customers.splice(customers.indexOf(customer), 1);
  return response.status(200).json(customers);
});

app.get('/balance', verifyIfExistsAccountCPF, (request, response) => {
  return response.status(200).json({
      balance: getBalance(request.customer.statement)
    }
  );
});

app.listen('3333');