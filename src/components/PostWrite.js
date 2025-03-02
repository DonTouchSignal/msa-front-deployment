import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import boardApi from '../api/boardApi';

function PostWrite() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const navigate = useNavigate();
  const { assetId } = useParams();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB 제한
        setError('이미지 크기는 5MB를 초과할 수 없습니다.');
        return;
      }
      if (!file.type.startsWith('image/')) {
        setError('이미지 파일만 업로드 가능합니다.');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('제목과 내용을 모두 입력해주세요.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const postData = {
        title: title.trim(),
        content: content.trim()
      };

      await boardApi.createPost(assetId, postData, image);
      navigate(`/assets/${assetId}/posts`);
    } catch (err) {
      setError('게시글 작성에 실패했습니다. 다시 시도해주세요.');
      console.error('Error creating post:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <div className="card bg-dark text-light">
        <div className="card-body">
          <h2 className="card-title mb-4">게시글 작성</h2>
          
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="title" className="form-label">제목</label>
              <input
                type="text"
                className="form-control bg-dark text-light"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="제목을 입력하세요"
                required
              />
            </div>

            <div className="mb-3">
              <label htmlFor="content" className="form-label">내용</label>
              <textarea
                className="form-control bg-dark text-light"
                id="content"
                rows="10"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="내용을 입력하세요"
                required
              />
            </div>

            {/* <div className="mb-3">
              <label htmlFor="image" className="form-label">이미지 첨부</label>
              <input
                type="file"
                className="form-control bg-dark text-light"
                id="image"
                accept="image/*"
                onChange={handleImageChange}
              />
              {imagePreview && (
                <div className="mt-2">
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="img-thumbnail"
                    style={{ maxHeight: '200px' }}
                  />
                </div>
              )}
              <small className="text-secondary">
                최대 5MB, 이미지 파일만 업로드 가능합니다.
              </small>
            </div> */}

            <div className="d-flex gap-2 justify-content-end">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate(`/assets/${assetId}/posts`)}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    저장 중...
                  </>
                ) : '저장'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PostWrite; 