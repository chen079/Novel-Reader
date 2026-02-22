import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("BACKEND_PORT_ENV", 3398))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
