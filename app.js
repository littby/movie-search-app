import express from 'express';
import axios from 'axios';
import mongoose from 'mongoose';
import dotenv from 'dotenv'; 
import methodOverride from 'method-override'; 
import Review from './models/Review.js';
import passport from 'passport';
import session from 'express-session'; 
import User from './models/user.js'; // 사용자 모델 불러오기
import './config/passport.js'; // passport 설정 파일


dotenv.config();  // .env 파일 불러오기

const app = express();

const PORT = 3000;
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const MONGO_URI = process.env.MONGO_URI;

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("✅ MongoDB 연결 성공!"))
    .catch(err => console.error("❌ MongoDB 연결 실패:", err));


// 세션 설정
app.use(session({
    secret: 'secret', // 세션 암호화 키
    resave: false,
    saveUninitialized: false,
}));

// Passport 초기화
app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static('public'));

// method-override 설정
app.use(methodOverride('_method')); 
// EJS 설정
app.set('view engine', 'ejs');

//회원가입 API 
app.post('/signup', async (req, res) => {
    const { email, password } = req.body;
    try {
        const newUser = new User({ email, password });
        await newUser.save();
        res.redirect('/login'); // 회원가입 후 로그인 페이지로 리디렉션
    } catch (error) {
        console.error("❌ 회원가입 오류:", error);
        res.redirect('/signup'); // 오류 발생 시 회원가입 페이지로 리디렉션
    }
});

//로그인 API
app.post('/login', passport.authenticate('local', {
    successRedirect: '/', // 로그인 성공 후 홈으로 리디렉션
    failureRedirect: '/login', // 로그인 실패 시 로그인 페이지로 리디렉션
    failureFlash: true, // 로그인 실패 시 플래시 메시지 표시
}));

//로그아웃 API
app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) return next(err);
        res.redirect('/'); // 로그아웃 후 홈 페이지로 리디렉션
    });
});

app.use(express.static('public')); // 정적 파일 경로 설정

// 기본 페이지 렌더링
app.get('/', (req, res) => {
    res.render('index', { movie: null, error: null }); // 기본 페이지는 movie와 error를 null로 전달
});

// 인증 
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login'); // 로그인 안 된 사용자는 로그인 페이지로 리디렉션
}

// 예시: 로그인한 사용자만 접근할 수 있는 페이지
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.render('dashboard', { user: req.user }); // 로그인한 사용자 정보 전달
});


// 영화 검색 API 연동
app.get('/search', async (req, res) => {
    const movieTitle = req.query.title;
    if (!movieTitle) {
        return res.render('index', { movie: null, error: '영화 제목을 입력해주세요.', reviews: [] });
    }

    try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);
        if (response.data.Response === 'False') {
            return res.render('index', { movie: null, error: '해당 영화의 정보가 없습니다.', reviews: [] });
        }

        const reviews = await Review.find({ movieTitle });
        
        res.render('index', { movie: response.data, error: null, reviews: reviews }); // 리뷰도 함께 전달
    } catch (error) {
        console.error(error);  // 콘솔에 에러 출력
        res.render('index', { movie: null, error: '영화 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.', reviews: [] });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});


// 리뷰 저장 API (MongoDB에 저장)
app.post('/review', async (req, res) => {
    const { movieTitle, rating, comment, author } = req.body;

    try {
        // 리뷰를 MongoDB에 저장
        const newReview = new Review({
            movieTitle,
            rating,
            comment,
            author
        });
        await newReview.save(); // MongoDB에 저장
        console.log("✅ 리뷰 저장 완료:", newReview);

        // 저장된 리뷰를 포함한 영화 정보를 다시 불러오기
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);
        const reviews = await Review.find({ movieTitle }); // 리뷰를 다시 조회

        // 영화 정보와 모든 리뷰를 렌더링
        res.render('index', { movie: response.data, reviews: reviews, error: null });

    } catch (error) {
        console.error("❌ 리뷰 저장 오류:", error);
        res.redirect(`/search?title=${movieTitle}&error=리뷰 저장 실패`);
    }
});


app.post('/review/delete', async (req, res) => {
    const { reviewId, movieTitle } = req.body;
    console.log('삭제하려는 영화 제목:', movieTitle);

    try {
        // 해당 리뷰를 삭제
        await Review.findByIdAndDelete(reviewId);
        console.log(`✅ 리뷰 삭제 완료: ${reviewId}`);

       
        res.redirect(`/search?title=${movieTitle}`);

    } catch (error) {
        console.error("❌ 리뷰 삭제 오류:", error);
        res.redirect(`/search?title=${movieTitle}&error=리뷰 삭제 실패`);
    }
});

app.post('/review/like/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        review.likes += 1;
        await review.save();
        
        res.redirect('back'); 
    } catch (error) {
        console.error("공감버튼 오류:", error);
        res.redirect('back'); 
    }
});


app.post('/review/dislike/:id', async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);
        review.dislikes += 1;
        await review.save();
        
        res.redirect('back'); 
    } catch (error) {
        console.error("비동의 버튼 오류:", error);
        res.redirect('back'); 
    }
});





