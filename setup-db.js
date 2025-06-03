export default {
  async fetch(request, env, ctx) {
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

      return new Response('tabelas criadas com sucesso!', {
        headers: { 'Content-Type': 'text/plain' }
      });
    } catch (error) {
      return new Response(`erro ao criar tabelas: ${error.message}`, {
        status: 500,
        headers: { 'Content-Type': 'text/plain' }
      });
    }
  }
}; 