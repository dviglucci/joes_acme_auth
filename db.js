const jwt = require("jsonwebtoken");
const Sequelize = require('sequelize');
const bcrypt = require("bcrypt");
const { STRING } = Sequelize;
const config = {
    logging: false
};

if (process.env.LOGGING) {
    delete config.logging;
}
const conn = new Sequelize(process.env.DATABASE_URL || 'postgres://joe-alves:buttons@localhost/acme_db', config);

const User = conn.define('user', {
    username: STRING,
    password: STRING
});

const secretSigningPhrase = process.env.AUTH_JWT_SECRET;

User.byToken = async (token) => {
    try {
        const unscrambledToken = jwt.verify(token, secretSigningPhrase);
        const user = await User.findByPk(unscrambledToken.userId);
        if (user) {
            return user;
        }
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }
    catch (ex) {
        console.log(ex);
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }
};

User.authenticate = async ({ username, password }) => {
    // username = lucy
    // password = lucy_pws
    const user = await User.findOne({
        where: {
            username
        }
    });

    if (!user) {
        const error = Error('bad credentials');
        error.status = 401;
        throw error;
    }

    const passwordsMatch = bcrypt.compareSync(password, user.password);

    if (passwordsMatch) {
        const newToken = jwt.sign({ userId: user.id }, secretSigningPhrase);
        return newToken; // token
    }
    const error = Error('bad credentials');
    error.status = 401;
    throw error;
};

const syncAndSeed = async () => {
    await conn.sync({ force: true });
    const credentials = [
        { username: 'lucy', password: bcrypt.hashSync('lucy_pw', 10) },
        { username: 'moe', password: bcrypt.hashSync('moe_pw', 10) },
        { username: 'larry', password: bcrypt.hashSync('larry_pw', 10) }
    ];
    const [lucy, moe, larry] = await Promise.all(
        credentials.map(credential => User.create(credential))
    );
    return {
        users: {
            lucy,
            moe,
            larry
        }
    };
};

module.exports = {
    syncAndSeed,
    models: {
        User
    }
};