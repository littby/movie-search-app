import passport from 'passport';
import LocalStrategy from 'passport-local';
import User from '../models/user'; 

// 로그인 시 인증 전략
passport.use(new LocalStrategy({
    usernameField: 'email', // 로그인 시 이메일로 인증
    passwordField: 'password', // 비밀번호로 인증
}, async (email, password, done) => {
    try {
        const user = await User.findOne({ email });
        if (!user) return done(null, false, { message: '사용자를 찾을 수 없습니다.' });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return done(null, false, { message: '잘못된 비밀번호입니다.' });

        return done(null, user);
    } catch (err) {
        return done(err);
    }
}));

// 세션에 사용자 정보 저장
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// 세션에서 사용자 정보 복원
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        done(err);
    }
});
