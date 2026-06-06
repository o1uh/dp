import { apiClient } from '@/shared/api/rest';

interface UploadInitData {
  file_hash: string;
  mime_type: string;
  file_size_bytes: number;
  duration_sec: number;
  original_filename: string;
  separation_mode?: string;
  title?: string;
}

interface UploadInitResponse {
  is_duplicate: boolean;
  upload_url?: string;
  file_id?: string;
  s3_key?: string;
  stems?: any[];
}

export const fileApi = {
  initUpload: async (data: UploadInitData): Promise<UploadInitResponse> => {
    const res = await apiClient.post('/files/upload-init', data);
    return res.data;
  },
  confirmUpload: async (fileId: string): Promise<void> => {
    await apiClient.post('/files/upload-confirm', { file_id: fileId });
  },
  uploadToS3: (url: string, file: File, onProgress: (pct: number) => void): Promise<void> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('PUT', url, true);
      xhr.setRequestHeader('Content-Type', file.type);
      
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100);
        }
      };
      
      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 204) resolve();
        else reject(new Error('S3 upload failed'));
      };
      
      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.send(file);
    });
  }
};