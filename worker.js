export default {
  async fetch(request, env, ctx) {
    if (request.method !== 'POST') {
      return new Response('Método não permitido', { status: 405 });
    }

    try {
      try {
        console.log('verificando/criando tabelas...');
        
        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS pontos (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            data TEXT NOT NULL,
            horario TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `).run();

        await env.DB.prepare(`
          CREATE TABLE IF NOT EXISTS respostas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT NOT NULL,
            username TEXT NOT NULL,
            data TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(user_id, data)
          )
        `).run();

        console.log('tabelas verificadas/criadas com sucesso');
      } catch (error) {
        console.error('erro ao criar tabelas:', error);
        throw error;
      }

      const { action, data } = await request.json();
      switch (action) {
        case 'registrar_ponto': {
          const { userId, username, horario, data: dataPonto } = data;
          console.log(`registrando ponto: ${username} - ${horario} - ${dataPonto}`);
          
          await env.DB.prepare(
            'INSERT INTO pontos (user_id, username, data, horario) VALUES (?, ?, ?, ?)'
          ).bind(userId, username, dataPonto, horario).run();
          
          console.log(`ponto registrado com sucesso para ${username}`);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        case 'buscar_pontos': {
          const dataAtual = new Date().toISOString().split('T')[0];
          console.log(`buscando pontos para data: ${dataAtual}`);
          
          const { results } = await env.DB.prepare(
            'SELECT * FROM pontos WHERE data = ? ORDER BY horario'
          ).bind(dataAtual).all();
          
          console.log(`encontrados ${results.length} pontos:`, results);
          return new Response(JSON.stringify({ success: true, pontos: results }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        case 'listar_pontos': {
          console.log('listando todos os pontos...');
          
          const { results } = await env.DB.prepare(
            'SELECT * FROM pontos ORDER BY data DESC, horario DESC LIMIT 10'
          ).all();
          
          console.log(`encontrados ${results.length} pontos:`, results);
          return new Response(JSON.stringify({ 
            success: true, 
            pontos: results,
            total: results.length
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        case 'registrar_resposta': {
          const { userId, username, data: dataResposta } = data;
          console.log(`registrando resposta: ${username} - ${dataResposta}`);
          
          await env.DB.prepare(
            'INSERT INTO respostas (user_id, username, data) VALUES (?, ?, ?)'
          ).bind(userId, username, dataResposta).run();
          
          console.log(`resposta registrada com sucesso para ${username}`);
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        case 'verificar_resposta': {
          const { userId, data: dataVerificacao } = data;
          console.log(`verificando resposta: ${userId} - ${dataVerificacao}`);
          
          const { results } = await env.DB.prepare(
            'SELECT 1 FROM respostas WHERE user_id = ? AND data = ? LIMIT 1'
          ).bind(userId, dataVerificacao).all();
          
          const respondeu = results.length > 0;
          console.log(`usuário ${userId} ${respondeu ? 'já respondeu' : 'ainda não respondeu'}`);
          
          return new Response(JSON.stringify({ 
            success: true, 
            respondeu 
          }), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        default:
          console.log(`ação não reconhecida: ${action}`);
          return new Response('Ação não reconhecida', { status: 400 });
      }
    } catch (error) {
      console.error('erro no worker:', error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  async scheduled(event, env, ctx) {
    try {
      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS pontos (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          data TEXT NOT NULL,
          horario TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `).run();

      await env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS respostas (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id TEXT NOT NULL,
          username TEXT NOT NULL,
          data TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(user_id, data)
        )
      `).run();

      console.log('tabelas criadas/verificadas com sucesso');
    } catch (error) {
      console.error('erro ao criar tabelas:', error);
    }
  }
}; 