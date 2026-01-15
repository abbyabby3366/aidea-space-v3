module.exports = {
  apps: [
    {
    name: 'svelte-template',
    script: 'node',
    args: 'build/index.js',
    env_file: '.env',
    port: 8212
    //must use here de port for node build/index.js
   },
   {
    name: 'whatsapp-server',
    script: 'node',
    cwd: './whatsapp-server',
    args: 'whatsapp-server.js',
    env_file: './.env',
    //can use the port inside .env
   }
]
};
