export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // CORS 预检请求
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Content-Disposition, X-File-Name",
      "Access-Control-Expose-Headers": "ETag",
    };
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 根据 URL 路径进行路由
    const pathname = url.pathname;

    // --- 1. 开始多部分上传 ---
    // 前端会请求 /start-upload?key=123456
    if (pathname === "/start-upload") {
      const key = url.searchParams.get("key");
      const fileName = request.headers.get("X-File-Name");

      if (!key) return new Response("Missing key", { status: 400 });

      // 创建一个多部分上传任务
      const multipartUpload = await env.BUCKET.createMultipartUpload(key, {
        httpMetadata: {
          contentType: request.headers.get("Content-Type"),
          // 关键：在这里设置文件名
          contentDisposition: `attachment; filename*=UTF-8''${encodeURIComponent(fileName)}`,
        },
      });

      return new Response(JSON.stringify({ uploadId: multipartUpload.uploadId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- 2. 上传单个分片 ---
    // 前端会请求 /upload-part?key=123456&uploadId=...&partNumber=1
    if (pathname === "/upload-part") {
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      const partNumber = parseInt(url.searchParams.get("partNumber"));

      if (!key || !uploadId || !partNumber) {
        return new Response("Missing parameters", { status: 400 });
      }

      // 获取 R2 中正在进行的多部分上传对象
      const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);

      // 上传分片
      const uploadedPart = await multipartUpload.uploadPart(partNumber, request.body);

      // 返回这个分片的 ETag，前端需要收集
      return new Response(JSON.stringify(uploadedPart), { headers: corsHeaders });
    }

    // --- 3. 完成上传 (合并分片) ---
    // 前端会请求 /complete-upload?key=123456&uploadId=...
    if (pathname === "/complete-upload") {
      const key = url.searchParams.get("key");
      const uploadId = url.searchParams.get("uploadId");
      const parts = await request.json(); // 前端会把所有分片的 ETag 发过来

      if (!key || !uploadId) return new Response("Missing parameters", { status: 400 });

      const multipartUpload = env.BUCKET.resumeMultipartUpload(key, uploadId);

      try {
        // 命令 R2 合并所有分片
        await multipartUpload.complete(parts);
        return new Response("Upload complete", { headers: corsHeaders });
      } catch (error) {
        // 如果合并失败（比如某个分片丢失），则终止上传
        await multipartUpload.abort();
        return new Response(error.message, { status: 500, headers: corsHeaders });
      }
    }

    // --- 4. 普通下载逻辑 (保持不变) ---
    // 普通 GET /123456 请求
    const key = pathname.slice(1);
    if (request.method === "GET" && key) {
      const object = await env.BUCKET.get(key);
      if (object === null) {
        return new Response("File not found", { status: 404, headers: corsHeaders });
      }
      const headers = new Headers();
      object.writeHttpMetadata(headers);
      headers.set("etag", object.httpEtag);
      for (const [k, v] of Object.entries(corsHeaders)) {
        headers.set(k, v);
      }
      return new Response(object.body, { headers });
    }

    return new Response("Not found", { status: 404 });
  },
};
