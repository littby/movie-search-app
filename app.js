import express from 'express';
import axios from 'axios';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv'; 
import methodOverride from 'method-override'; 
import Review from './models/Review.js';
import session from 'express-session';
import Bookmark from './models/Bookmark.js';



dotenv.config();  // .env 파일 불러오기

const app = express();

app.set('view engine', 'ejs'); // EJS 템플릿 엔진 사용
app.set('views', path.join(path.resolve(), 'views'));

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



app.use(express.urlencoded({ extended: true }));
app.use(express.json()); 
app.use(express.static('public'));

// method-override 설정
app.use(methodOverride('_method')); 
// EJS 설정
app.set('view engine', 'ejs');




app.use(express.static('public')); // 정적 파일 경로 설정

// 기본 페이지 렌더링
app.get('/', (req, res) => {
    res.render('index', {
        user: req.user,
        movie: null, 
        error: null,
        reviews: [],
        avgRating: null
    }); // 기본 페이지는 movie와 error를 null로 전달
});



// 영화 검색 API 연동
app.get('/search', async (req, res) => {
    const movieTitle = req.query.title;
    if (!movieTitle) {
        return res.render('index', { 
            movie: null, 
            error: '영화 제목을 입력해주세요.', 
            reviews: [],
            avgRating: null });
    }

    try {
        const response = await axios.get(`http://www.omdbapi.com/?apikey=${OMDB_API_KEY}&t=${movieTitle}`);
        if (response.data.Response === 'False') {
            return res.render('index', { 
                movie: null, 
                error: '해당 영화의 정보가 없습니다.', 
                reviews: [],
                avgRating: null
             });
        }

        const isBookmarked = await Bookmark.findOne({ movieTitle: response.data.Title }) ? true : false;


        // 평균 별점 계산 
        const reviews = await Review.find({ movieTitle }).sort({ likes: -1 });
        const totalRating = reviews.reduce((acc, review) => acc + Number(review.rating), 0);
        const avgRating = reviews.length ? (totalRating / reviews.length).toFixed(1) : null;

        
        res.render('index', { 
            movie: response.data, 
            error: null, 
            reviews: reviews,
            avgRating: avgRating,
            isBookmarked }); // 리뷰도 함께 전달
    } catch (error) {
        console.error(error);  // 콘솔에 에러 출력
        res.render('index', { 
            movie: null, 
            error: '영화 정보를 가져오는 데 실패했습니다. 잠시 후 다시 시도해 주세요.', 
            reviews: [],
            avgRating: null,
            isBookmarked : false 
        });
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
        res.render('index', { 
            movie: response.data, 
            reviews: reviews, 
            error: null,
            avgRating: avgRating });

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

app.put('/review/:id', async (req, res) => {
    const reviewId = req.params.id;
    const { rating, comment } = req.body;
    

    try {
        const updatedReview = await Review.findByIdAndUpdate(
            reviewId, 
            { rating, comment }, 
            { new: true } // 업데이트 후 변경된 데이터 반환
        );

        console.log("✅ 리뷰 수정 완료:", updatedReview);
        res.redirect(`/search?title=${updatedReview.movieTitle}`);
    } catch (error) {
        console.error("❌ 리뷰 수정 오류:", error);
        res.redirect(`/search?title=${req.body.movieTitle}&error=리뷰 수정 실패`);
    }
});

app.post('/bookmark', async (req, res) => {
    const { movieTitle } = req.body;

    try {
        const bookmark = await Bookmark.findOne({ movieTitle: movieTitle });

        if (bookmark) {
            await Bookmark.deleteOne({ movieTitle: movieTitle }); // 이미 있으면 삭제 (토글 기능)
            return res.json({ message: '북마크 삭제됨',isBookmarked: false });
        } else {
            await Bookmark.create({ movieTitle: movieTitle });
            return res.json({ message: '북마크 추가됨',isBookmarked: true });
        }
    } catch (error) {
        console.error('❌ 북마크 오류:', error);
        res.status(500).json({ error: '서버 오류' });
    }
});

app.get('/bookmarks', async (req, res) => {
    try {
        const bookmarks = await Bookmark.find();
        res.render('bookmarks', { bookmarks });
    } catch (error) {
        console.error('❌ 북마크 목록 불러오기 오류:', error);
        res.status(500).send('북마크 목록을 가져올 수 없습니다.');
    }
});

