// The inline-import plugin is what lets Drizzle's generated .sql migration files be
// bundled into the app. Without it `drizzle/migrations.js` resolves to nothing at
// runtime and the database comes up with no tables — silently, on device only.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [['inline-import', { extensions: ['.sql'] }]],
  };
};
