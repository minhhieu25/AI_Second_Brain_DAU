# NLP Pipeline Interface
# Đồ án quy định sử dụng các mô hình mã nguồn mở (Local NLP Models) như:
# - BARTpho / ViT5 cho tóm tắt và bóc tách
# - TextRank / SVM cho phân loại (classification)
# - NLI (Natural Language Inference) cho 3 nhãn (entailment/contradiction/neutral)

import re
import os
import warnings
from typing import Dict, Any
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ZAI_API_KEY = os.getenv("ZAI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)

# Lazy loading cho embedding model siêu nhẹ
_embedding_model = None

def get_embedding_model():
    global _embedding_model
    if _embedding_model is None:
        try:
            from sentence_transformers import SentenceTransformer
            print("Dang tai mo hinh Embedding (MiniLM - 15MB)...")
            _embedding_model = SentenceTransformer("paraphrase-MiniLM-L3-v2")
        except Exception as e:
            print(f"Lỗi tải MiniLM: {e}")
    return _embedding_model

class LegalInformationExtractor:
    def __init__(self, use_ai=False):
        self.use_ai = use_ai
        self.pipeline = None
        if self.use_ai:
            import torch
            self.torch = torch
            
            # Khởi tạo None (Lazy Loading)
            self.model_name_qa = "timpal0l/mdeberta-v3-base-squad2"
            self.tokenizer = None
            self.qa_model = None
            
            self.sum_tokenizer = None
            self.sum_model = None
            
            self.nli_tokenizer = None
            self.nli_model = None

    def _manage_memory(self, active_model: str):
        """Chỉ giữ 1 mô hình lớn trong RAM để tránh tràn RAM (WinError 1455)"""
        import gc
        cleared = False
        if active_model != 'qa' and self.qa_model is not None:
            self.qa_model = None
            self.tokenizer = None
            cleared = True
        if active_model != 'sum' and self.sum_model is not None:
            self.sum_model = None
            self.sum_tokenizer = None
            cleared = True
        if active_model != 'nli' and self.nli_model is not None:
            self.nli_model = None
            self.nli_tokenizer = None
            cleared = True
            
        if cleared:
            gc.collect()
            
    def _get_qa_model(self):
        self._manage_memory('qa')
        if self.qa_model is None:
            from transformers import AutoTokenizer, AutoModelForQuestionAnswering
            print("Dang tai mo hinh AI QA...")
            self.tokenizer = AutoTokenizer.from_pretrained(self.model_name_qa)
            self.qa_model = AutoModelForQuestionAnswering.from_pretrained(self.model_name_qa)
        return self.tokenizer, self.qa_model
        
    def _get_sum_model(self):
        self._manage_memory('sum')
        if self.sum_model is None:
            from transformers import AutoTokenizer, AutoModelForSeq2SeqLM
            import os
            print("Dang tai mo hinh Summarization (BARTpho/ViT5)...")
            BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
            patched_dir = os.path.join(BASE_DIR, "bin", "patched_tokenizer")
            if os.path.exists(patched_dir):
                self.sum_tokenizer = AutoTokenizer.from_pretrained(patched_dir, use_fast=False)
            else:
                self.sum_tokenizer = AutoTokenizer.from_pretrained("VietAI/vit5-base-vietnews-summarization", use_fast=False)
            self.sum_model = AutoModelForSeq2SeqLM.from_pretrained("VietAI/vit5-base-vietnews-summarization")
        return self.sum_tokenizer, self.sum_model
        
    def _get_nli_model(self):
        self._manage_memory('nli')
        if self.nli_model is None:
            from transformers import AutoTokenizer, AutoModelForSequenceClassification
            print("Dang tai mo hinh NLI (3 nhan)...")
            self.nli_tokenizer = AutoTokenizer.from_pretrained("MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7")
            self.nli_model = AutoModelForSequenceClassification.from_pretrained("MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7")
        return self.nli_tokenizer, self.nli_model

    def _ask_qa(self, question, context):
        tokenizer, qa_model = self._get_qa_model()
        inputs = tokenizer(question, context, return_tensors="pt", truncation=True, max_length=512)
        with self.torch.no_grad():
            outputs = qa_model(**inputs)
        
        start_idx = self.torch.argmax(outputs.start_logits)
        end_idx = self.torch.argmax(outputs.end_logits)
        
        start_prob = self.torch.max(self.torch.softmax(outputs.start_logits, dim=-1))
        end_prob = self.torch.max(self.torch.softmax(outputs.end_logits, dim=-1))
        
        score = (start_prob + end_prob) / 2.0
        
        if start_idx > end_idx or start_idx == 0: # 0 is CLS token meaning no answer
            return {"answer": "", "score": 0.0}
            
        answer_tokens = inputs.input_ids[0][start_idx : end_idx + 1]
        answer = tokenizer.decode(answer_tokens, skip_special_tokens=True)
        
        return {
            "answer": answer.strip(),
            "score": score.item()
        }
        


    def extract_obligation(self, text_chunk: str) -> Dict[str, str]:
        """
        Bóc tách Nghĩa vụ (Chủ thể, Hành động, Hạn chót) từ một đoạn văn bản.
        """
        try:
            # Ngưỡng tự tin (Score threshold) để ngăn chặn "vơ đại"
            confidence_threshold = 0.05
            safe_context = text_chunk[:1000]
            
            # 1. Hỏi Chủ thể
            ans_sub = self._ask_qa("Ai là người thực hiện hoặc chịu trách nhiệm?", safe_context)
            subject = ans_sub['answer'] if ans_sub['score'] > confidence_threshold else "Không có"
            
            # 2. Hỏi Hành động
            ans_act = self._ask_qa("Phải làm nhiệm vụ gì?", safe_context)
            action = ans_act['answer'] if ans_act['score'] > confidence_threshold else "Không có"
            
            # 3. Hỏi Hạn chót
            ans_dead = self._ask_qa("Hạn chót hoặc thời gian thực hiện là khi nào?", safe_context)
            deadline = ans_dead['answer'] if ans_dead['score'] > confidence_threshold else "Không có"
            
            return {
                "chu_the": subject.capitalize(),
                "han_chot": deadline,
                "noi_dung": action.capitalize()
            }
        except Exception as e:
            err_msg = str(e)
            if "1455" in err_msg or "memory" in err_msg.lower() or "paging file" in err_msg.lower() or "allocate" in err_msg.lower():
                raise RuntimeError("Lỗi xử lý do tràn bộ nhớ, bạn có thể bắt đầu lại.")
            else:
                raise RuntimeError(f"Lỗi AI khi bóc tách Nghĩa vụ: {err_msg}. Bạn có thể xử lý lại.")

    def extract_document_metadata(self, text: str) -> Dict[str, str]:
        """
        Bóc tách siêu dữ liệu chung của văn bản (Metadata):
        Cơ quan, Người ký, Ngày ký, Ngày hiệu lực.
        """
        text_lower = text.lower()
        metadata = {
            "co_quan_ban_hanh": "",
            "ngay_ky": "",
            "nguoi_ky": "",
            "hieu_luc_tu": "",
            "tags": ""
        }
        
        # 1. Cơ quan ban hành: Thường ở 500 ký tự đầu, in hoa (hoặc viết hoa chữ cái đầu), nằm trên cùng.
        head_text = text[:1000]
        co_quan_pattern = r"(BỘ\s+GIÁO\s+DỤC\s+VÀ\s+ĐÀO\s+TẠO|BỘ\s+TÀI\s+CHÍNH|THỦ\s+TƯỚNG\s+CHÍNH\s+PHỦ|CHÍNH\s+PHỦ|ĐẠI\s+HỌC\s+ĐÀ\s+NẴNG)"
        match_co_quan = re.search(co_quan_pattern, head_text, re.IGNORECASE)
        if match_co_quan:
            metadata["co_quan_ban_hanh"] = match_co_quan.group(1).upper()
            
        # 2. Ngày ký: Thường là "Hà Nội, ngày ... tháng ... năm ..." ở góc phải trên.
        ngay_ky_pattern = r"(?:Hà Nội|Đà Nẵng|TP\.HCM|TP\.\s*Hồ Chí Minh)?\s*,?\s*ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})"
        match_ngay = re.search(ngay_ky_pattern, head_text, re.IGNORECASE)
        if match_ngay:
            metadata["ngay_ky"] = f"{match_ngay.group(1).zfill(2)}/{match_ngay.group(2).zfill(2)}/{match_ngay.group(3)}"
            
        # 3. Người ký: Quét ở 1500 ký tự cuối của văn bản
        tail_text = text[-1500:] if len(text) > 1500 else text
        nguoi_ky_pattern = r"(?:BỘ\s+TRƯỞNG|THỨ\s+TRƯỞNG|HIỆU\s+TRƯỞNG|PHÓ\s+HIỆU\s+TRƯỞNG|KT\.\s+BỘ\s+TRƯỞNG|TM\.\s+CHÍNH\s+PHỦ)(?:\n|.)*?(?P<name>[A-ZÀ-Ỹ][A-ZÀ-Ỹa-zà-ỹ\s]{5,30})"
        # Simple heuristic: Look for title in caps, then the next fully capitalized string or title case string which looks like a name.
        # Actually a simpler regex for Vietnamese names after a title:
        titles = ["BỘ TRƯỞNG", "THỨ TRƯỞNG", "HIỆU TRƯỞNG", "KT. BỘ TRƯỞNG", "TM. CHÍNH PHỦ", "KT. HIỆU TRƯỞNG"]
        for title in titles:
            if title.lower() in tail_text.lower():
                # Extract text after title
                idx = tail_text.lower().rfind(title.lower())
                after_title = tail_text[idx + len(title):idx + len(title) + 150].strip()
                # Find lines that might be names (often capitalized, length 2-5 words)
                lines = after_title.split('\n')
                for line in lines:
                    line = line.strip()
                    # Tên người ký thường không chứa các ký tự đặc biệt, dấu câu, hay các chữ "Nơi nhận", "Lưu"
                    if 5 <= len(line) <= 30 and sum(1 for c in line if c.isupper()) >= 2:
                        if not any(char in line for char in ['-', ':', '.', ',', 'Nơi', 'Lưu', 'Bộ', 'Phòng', 'Ban']):
                            metadata["nguoi_ky"] = line
                            break
                if metadata["nguoi_ky"]:
                    break
                    
        # 4. Ngày hiệu lực: Quét trên toàn bộ văn bản thay vì chỉ 1500 ký tự cuối
        hieu_luc_pattern = r"có\s+hiệu\s+lực\s*(?:thi\s+hành)?\s*(?:kể\s+)?từ\s+ngày\s+(\d{1,2})\s*[/tháng-]\s*(\d{1,2})\s*[/năm-]\s*(\d{4})"
        match_hl = re.search(hieu_luc_pattern, text_lower)
        if match_hl:
            metadata["hieu_luc_tu"] = f"{match_hl.group(1).zfill(2)}/{match_hl.group(2).zfill(2)}/{match_hl.group(3)}"
            
        # 5. Từ khóa (Tags): Rút trích tự động
        keywords = ["tuyển sinh", "đào tạo", "giáo trình", "chuẩn đầu ra", "học phí", "tài chính", "khảo thí", "đánh giá", "kiểm định", "sinh viên", "giảng viên", "chính phủ", "quy chế", "thông tư"]
        tags = []
        for kw in keywords:
            if kw in text_lower and kw not in tags:
                tags.append(kw)
        metadata["tags"] = ",".join(tags[:5]) # Lấy tối đa 5 từ khoá
        
        return metadata

    def extract_threshold(self, text_chunk: str) -> Dict[str, str]:
        """
        Bóc tách Con số chốt (Thresholds / Định mức).
        """
        try:
            safe_context = text_chunk[:1000]
            ans_thresh = self._ask_qa("Con số, số lượng hoặc tỷ lệ là bao nhiêu?", safe_context)
            if ans_thresh['score'] > 0.05 and ans_thresh['answer']:
                return {
                    "gia_tri": f"Ngưỡng: {ans_thresh['answer']}",
                    "y_nghia": "Được trích xuất bởi AI"
                }
            return {
                "gia_tri": "Không có con số chốt",
                "y_nghia": "Định mức chung"
            }
        except Exception as e:
            err_msg = str(e)
            if "1455" in err_msg or "memory" in err_msg.lower() or "paging file" in err_msg.lower() or "allocate" in err_msg.lower():
                raise RuntimeError("Lỗi xử lý do tràn bộ nhớ, bạn có thể bắt đầu lại.")
            else:
                raise RuntimeError(f"Lỗi AI khi bóc tách Định mức: {err_msg}. Bạn có thể xử lý lại.")

    def summarize_text(self, text: str) -> str:
        """
        Tóm tắt văn bản dùng mô hình BARTpho / ViT5
        """
        try:
            sum_tokenizer, sum_model = self._get_sum_model()
            # Cắt bớt input nếu quá dài để tránh lỗi OOM
            input_text = text[:1024]
            inputs = sum_tokenizer(input_text, return_tensors="pt", max_length=1024, truncation=True)
            outputs = sum_model.generate(**inputs, max_length=100, min_length=15, do_sample=False)
            summary = sum_tokenizer.decode(outputs[0], skip_special_tokens=True)
            return summary
        except Exception as e:
            err_msg = str(e)
            if "1455" in err_msg or "memory" in err_msg.lower() or "paging file" in err_msg.lower() or "allocate" in err_msg.lower():
                raise RuntimeError("Lỗi xử lý do tràn bộ nhớ, bạn có thể bắt đầu lại.")
            else:
                raise RuntimeError(f"Lỗi AI khi tóm tắt văn bản: {err_msg}. Bạn có thể xử lý lại.")

    def verify_nli(self, premise: str, hypothesis: str) -> str:
        """
        Kiểm tra độ trung thực NLI (Entailment, Contradiction, Neutral).
        """
        try:
            nli_tokenizer, nli_model = self._get_nli_model()
            inputs = nli_tokenizer(premise, hypothesis, truncation=True, max_length=512, return_tensors="pt")
            with self.torch.no_grad():
                output = nli_model(**inputs)
            
            prediction = self.torch.softmax(output["logits"][0], -1).tolist()
            label_names = ["entailment", "neutral", "contradiction"]
            prediction_dict = {name: float(pred) for pred, name in zip(prediction, label_names)}
            best_label = max(prediction_dict, key=prediction_dict.get)
            return best_label
        except Exception as e:
            err_msg = str(e)
            if "1455" in err_msg or "memory" in err_msg.lower() or "paging file" in err_msg.lower() or "allocate" in err_msg.lower():
                raise RuntimeError("Lỗi xử lý do tràn bộ nhớ, bạn có thể bắt đầu lại.")
            else:
                raise RuntimeError(f"Lỗi AI NLI: {err_msg}. Bạn có thể xử lý lại.")

    def extract_document_relations(self, text: str, source_doc: str) -> list[Dict[str, str]]:
        """
        Dùng Regex để tìm các quan hệ: Căn cứ, Thay thế, Bãi bỏ.
        """
        relations = []
        
        # Split text into sentences
        sentences = [s.strip() for s in re.split(r'[\.\n]+', text) if s.strip()]
        pattern = r"(căn cứ|bãi bỏ toàn bộ|bãi bỏ một phần|bãi bỏ|thay thế|sửa đổi,? bổ sung)\s+(?:.*?)(thông tư|nghị định|quyết định|luật|công văn)\s+(số\s+)?(\d+/[^\s,\.\(]+)"
        
        for sentence in sentences:
            sentence_lower = sentence.lower()
            matches = re.finditer(pattern, sentence_lower)
            for match in matches:
                action = match.group(1).strip().replace(',', '')
                doc_type = match.group(2).strip().capitalize()
                doc_number = match.group(4).strip().upper()
                
                target_doc = f"{doc_type} {doc_number}"
                
                # Chuẩn hoá quan hệ
                rel_type = "căn cứ"
                if "bãi bỏ" in action:
                    rel_type = "bị bãi bỏ toàn bộ" if "toàn bộ" in action else "bị bãi bỏ một phần"
                    if action == "bãi bỏ": rel_type = "bị bãi bỏ một phần"
                elif "thay thế" in action:
                    rel_type = "bị thay thế"
                elif "sửa đổi" in action:
                    rel_type = "được sửa đổi bổ sung"
                    
                relations.append({
                    "source_doc": source_doc,
                    "target_doc": target_doc,
                    "relation_type": rel_type,
                    "nguyen_van": sentence
                })
            
        return relations

# Khởi tạo instance toàn cục (Bật use_ai=True để sử dụng mô hình QA)
extractor = LegalInformationExtractor(use_ai=True)

def classify_text(text: str) -> str:
    """
    Phân loại chủ đề văn bản dựa trên thuật toán Cân điểm Từ khóa (Keyword Scoring).
    Sử dụng thay cho TextRank/SVM khi chưa có dữ liệu huấn luyện.
    """
    text_lower = text.lower()
    
    # Định nghĩa các chủ đề và trọng số từ khóa
    topics = {
        "Tuyển sinh": ["tuyển sinh", "thí sinh", "xét tuyển", "trúng tuyển", "chỉ tiêu", "nhập học", "điểm chuẩn"],
        "Đào tạo": ["chương trình đào tạo", "tín chỉ", "sinh viên", "giảng viên", "học phần", "điểm thi", "chuẩn đầu ra", "tốt nghiệp"],
        "Tài chính": ["học phí", "ngân sách", "chi tiêu", "tài chính", "dự toán", "quyết toán", "lương", "thu nhập"],
        "Đảm bảo chất lượng": ["kiểm định", "đánh giá", "chất lượng", "khảo thí", "đo lường", "obe", "cbe", "chuẩn quốc gia"],
        "Hợp tác quốc tế": ["quốc tế", "nước ngoài", "liên kết", "trao đổi", "du học", "đối tác", "mou", "moa"],
        "Nghiên cứu Khoa học": ["nghiên cứu", "khoa học", "đề tài", "bài báo", "hội thảo", "tạp chí", "isi", "scopus"]
    }
    
    scores = {topic: 0 for topic in topics.keys()}
    
    # Đếm tần suất xuất hiện để tính điểm
    for topic, keywords in topics.items():
        for kw in keywords:
            # Cộng điểm dựa trên số lần xuất hiện của từ khóa
            scores[topic] += text_lower.count(kw)
            
    # Lấy chủ đề có điểm cao nhất
    max_score = 0
    best_topic = "Khác"
    
    for topic, score in scores.items():
        if score > max_score and score >= 3: # Cần ít nhất 3 điểm để được xếp loại
            max_score = score
            best_topic = topic
            
    return best_topic
def create_embedding(text: str) -> list[float]:
    """
    Tạo Vector nhúng bằng mô hình siêu nhẹ (MiniLM).
    """
    model = get_embedding_model()
    if model is not None:
        try:
            return model.encode(text).tolist()
        except Exception as e:
            print(f"Lỗi tạo embedding: {e}")
            
    return [0.0] * 384

def generate_rag_answer(query: str, context_chunks: list[str]) -> str:
    """
    Sử dụng Gemini API để sinh câu trả lời RAG dựa trên các đoạn ngữ cảnh.
    """
    if not GEMINI_API_KEY and not ZAI_API_KEY:
        return "Hệ thống chưa được cấu hình GEMINI_API_KEY hay ZAI_API_KEY trong file .env. Vui lòng thêm API Key để sử dụng tính năng Chatbot AI."
        
    context_text = "\n\n---\n\n".join(context_chunks)
    
    prompt = f"""Bạn là một Trợ lý AI pháp lý chuyên nghiệp của Hệ thống DAU Second Brain. 
Nguyên tắc hoạt động:
1. GIAO TIẾP THÔNG THƯỜNG: Nếu người dùng chào hỏi, hỏi thăm hoặc hỏi về khả năng của bạn (VD: "Bạn là ai?", "Bạn làm được gì?"), hãy trả lời tự nhiên, lịch sự và giới thiệu bạn là Trợ lý AI chuyên tra cứu Quy chế, Thông tư nội bộ của trường.
2. TRẢ LỜI NGHIỆP VỤ: Nếu người dùng hỏi về quy định, luật lệ, HÃY CHỈ DỰA VÀO phần TÀI LIỆU NGỮ CẢNH bên dưới để tổng hợp câu trả lời. 
3. CHỐNG ẢO GIÁC (HALLUCINATION): Nếu câu hỏi liên quan đến quy định/pháp luật nhưng TÀI LIỆU NGỮ CẢNH không chứa thông tin phù hợp, HÃY NÓI RÕ: "Dựa vào các văn bản hiện có trên hệ thống, tôi không tìm thấy thông tin để trả lời câu hỏi này." Tuyệt đối không dùng kiến thức bên ngoài để bịa ra luật.

TÀI LIỆU NGỮ CẢNH:
{context_text}

CÂU HỎI CỦA NGƯỜI DÙNG: {query}
"""
    error_msg = ""
    # 1. Thử dùng Gemini trước
    if GEMINI_API_KEY:
        try:
            model = genai.GenerativeModel('gemini-3.5-flash')
            response = model.generate_content(prompt)
            return response.text
        except Exception as e:
            error_msg = str(e)
            print(f"Lỗi Gemini: {error_msg}. Chuyển sang Z.ai dự phòng...")
            
    # 2. Nếu Gemini không có key hoặc bị lỗi (hết token), chuyển qua Z.ai (GLM)
    if ZAI_API_KEY:
        try:
            import requests
            url = "https://api.z.ai/api/paas/v4/chat/completions"
            headers = {
                "Authorization": f"Bearer {ZAI_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "model": "glm-4-flash",
                "messages": [
                    {"role": "user", "content": prompt}
                ]
            }
            res = requests.post(url, headers=headers, json=data)
            if res.status_code == 200:
                resp_json = res.json()
                return resp_json["choices"][0]["message"]["content"]
            else:
                return f"Lỗi gọi Z.ai API: {res.text}"
        except Exception as e:
            return f"Lỗi khi gọi dự phòng Z.ai: {str(e)}"
            
    if "429" in error_msg or "Quota exceeded" in error_msg:
        return "Hệ thống đang quá tải do hết lượt gọi AI miễn phí. Sếp vui lòng đợi khoảng 1-2 phút rồi hỏi lại nhé!"
    return f"Xin lỗi, đã xảy ra lỗi khi gọi AI: {error_msg}"
