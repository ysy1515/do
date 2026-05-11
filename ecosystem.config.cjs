module.exports = {
  apps: [
    {
      name: "do",
      script: "server.js",
      cwd: "/home/yahya/do",
      env: {
        NODE_ENV: "production",
        APP_PORT: "3050",
        AUTHORIZED_EMAIL: "yalshahrani@asda.gov.sa",
        LOGIN_PIN: "908010",
        REMINDER_TO: "yalshahrani@asda.gov.sa",
        SMTP_HOST: "",
        SMTP_PORT: "587",
        SMTP_USER: "",
        SMTP_PASS: "",
        SMTP_FROM: ""
      }
    }
  ]
};
