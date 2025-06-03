const fetch = require('node-fetch');
require('dotenv').config();

async function checkPoints() {
  try {
    const response = await fetch(process.env.WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'listar_pontos'
      })
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('\n ultimos pontos registradosz:');
      console.log('------------------------');
      
      result.pontos.forEach(ponto => {
        console.log(`${ponto.username} - ${ponto.data} às ${ponto.horario}`);
      });
      
      console.log('------------------------');
      console.log(`Total: ${result.total} pontos\n`);
    } else {
      console.error('Erro ao buscar pontos:', result.error);
    }
  } catch (error) {
    console.error(' Erro:', error.message);
  }
}

checkPoints(); 