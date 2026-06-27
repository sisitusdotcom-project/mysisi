const url = 'https://script.google.com/macros/s/AKfycbw0hxFYu7bBLscy67ZyrMk62Uo8I03-27PGDfBmZ9h8SQKphB5KZjLBoMmZF4ELNbmu/exec';
const params = new URLSearchParams();
params.append('action', 'syncorderstatus');
params.append('orderId', 'ORDER-1782576913072');

fetch(url, {
  method: 'POST',
  body: params
})
.then(res => res.json())
.then(data => console.log(JSON.stringify(data, null, 2)))
.catch(err => console.error(err));
