import 'dotenv/config';
import jwt from 'jsonwebtoken';

const payload = {
  keyword: "GoTo",
  includeActors: true,
  includeWebScrapers: true,
  tiers: [1, 2],
  maxWebItems: 20
};

const token = jwt.sign({ id: '00000000-0000-4000-8000-000000000001', email: 'owner@example.com' }, process.env.JWT_SECRET || 'test-secret');

fetch('http://localhost:3000/sources/bootstrap-defaults', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify(payload)
})
.then(res => res.json().then(data => ({ status: res.status, data })))
.then(console.log)
.catch(console.error);