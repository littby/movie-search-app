import mongoose from 'mongoose';

const bookmarkSchema = new mongoose.Schema({
    movieTitle: { 
        type: String, 
        required: true, 
        unique: true }
});

const Bookmark = mongoose.model('Bookmark', bookmarkSchema); 

export default Bookmark;