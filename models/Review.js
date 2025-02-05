import mongoose from 'mongoose';

// 리뷰 스키마 정의
const reviewSchema = new mongoose.Schema({
    movieTitle: {
        type: String,
        required: true,
    },
    rating: {
        type: Number,
        required: true,
    },
    comment: {
        type: String,
        required: true,
    },
    author: {
        type: String,
        required: true
    }
});

// 리뷰 모델 생성
const Review = mongoose.model('Review', reviewSchema);

export default Review; 
