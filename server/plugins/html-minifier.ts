import { minify } from 'html-minifier-terser';

export default defineNitroPlugin(nitroApp => {
  nitroApp.hooks.hook('render:response', async response => {
    if (typeof response.body === 'string') {
      response.body = response.body.replace('<body >', '<body>');

      const regex = /<body>([\s\S]*?)<\/body>/;
      const match = regex.exec(response.body);

      if (match) {
        const body = match[0];
        const html = await minify(response.body.replace(body, ''), {
          collapseWhitespace: true,
          minifyCSS: true,
          minifyJS: true,
        });

        response.body = html.replace(/(<\/head>)/, '$1' + body);
      }
    }
  });
});
