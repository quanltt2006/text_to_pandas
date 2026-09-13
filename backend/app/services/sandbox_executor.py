"""Sandbox Executor Service - Safe code execution"""
import pandas as pd
import numpy as np
import io
import sys
import traceback
from typing import Dict, Any, Optional, Tuple
from contextlib import redirect_stdout, redirect_stderr
from loguru import logger

from app.core.config import settings

class SandboxExecutor:
    """Execute generated code in a sandboxed environment"""
    
    # Whitelisted modules
    ALLOWED_MODULES = {
        'pandas', 'numpy', 'math', 'datetime', 're', 'json',
        'collections', 'itertools', 'functools', 'operator'
    }
    
    # Forbidden operations
    FORBIDDEN_PATTERNS = [
        'import os', 'import sys', 'import subprocess', 'import shutil',
        'open(', 'exec(', 'eval(', '__import__', 'compile(',
        'os.system', 'os.popen', 'subprocess.', 'shutil.',
        'file(', 'input(', 'raw_input(',
    ]
    
    def __init__(self):
        self.timeout = settings.SANDBOX_TIMEOUT_SECONDS
        self.max_memory_mb = settings.SANDBOX_MAX_MEMORY_MB
    
    def validate_code(self, code: str) -> Tuple[bool, str]:
        """Validate code for safety"""
        # Check for forbidden patterns
        for pattern in self.FORBIDDEN_PATTERNS:
            if pattern in code:
                return False, f"Code contains forbidden pattern: {pattern}"
        
        # Check for dangerous imports
        lines = code.split('\n')
        for line in lines:
            line = line.strip()
            if line.startswith('import ') or line.startswith('from '):
                module = line.split()[1].split('.')[0]
                if module not in self.ALLOWED_MODULES:
                    return False, f"Import not allowed: {module}"
        
        return True, "Code is safe"
    
    def execute(self, code: str, df: pd.DataFrame) -> Dict[str, Any]:
        """Execute code in sandbox"""
        logger.info("Executing code in sandbox")
        
        # Validate code first
        is_safe, message = self.validate_code(code)
        if not is_safe:
            return {
                "success": False,
                "error": f"Security violation: {message}",
                "output": None,
                "result": None
            }
        
        # Prepare execution environment
        env = {
            'df': df.copy(),  # Work on a copy
            'pd': pd,
            'np': np,
            'print': print,
        }
        
        # Capture output
        stdout_capture = io.StringIO()
        stderr_capture = io.StringIO()
        
        try:
            with redirect_stdout(stdout_capture), redirect_stderr(stderr_capture):
                exec(code, env)
            
            output = stdout_capture.getvalue()
            stderr = stderr_capture.getvalue()
            
            # Try to extract result
            result = env.get('result', None)
            
            # Convert result to serializable format
            result_data = None
            if result is not None:
                result_data = self._serialize_result(result)
            
            logger.info(f"Code executed successfully. Output length: {len(output)}")
            
            return {
                "success": True,
                "error": stderr if stderr else None,
                "output": output,
                "result": result_data
            }
            
        except Exception as e:
            error_msg = f"{type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
            logger.error(f"Code execution failed: {error_msg}")
            
            return {
                "success": False,
                "error": error_msg,
                "output": stdout_capture.getvalue(),
                "result": None
            }
    
    def _serialize_result(self, result: Any) -> Any:
        """Convert result to JSON-serializable format"""
        # DataFrame
        if isinstance(result, pd.DataFrame):
            df = result.head(50).copy()
            # Keep a meaningful index (crosstab / groupby / pivot...) as a column
            meaningful_index = not isinstance(df.index, pd.RangeIndex) or df.index.name is not None
            if meaningful_index:
                df = df.reset_index()
            headers = [str(h) for h in df.columns]
            rows = df.astype(object).where(pd.notna(df), None).values.tolist()
            rows = [["" if v is None else str(v) for v in row] for row in rows]
            return {
                "type": "dataframe",
                "headers": headers,
                "rows": rows,
                "shape": list(result.shape)
            }

        # Series
        elif isinstance(result, pd.Series):
            s = result.head(50).astype(object)
            data = {}
            for k, v in s.where(pd.notna(s), None).items():
                if v is None:
                    data[str(k)] = ""
                elif isinstance(v, (np.integer,)):
                    data[str(k)] = int(v)
                elif isinstance(v, (np.floating,)):
                    data[str(k)] = float(v)
                else:
                    data[str(k)] = v
            return {
                "type": "series",
                "data": data
            }
        
        # Dict
        elif isinstance(result, dict):
            return {
                "type": "dict",
                "data": result
            }
        
        # List
        elif isinstance(result, list):
            return {
                "type": "list",
                "data": result[:50]  # Limit to 50 items
            }
        
        # Numeric
        elif isinstance(result, (int, float, np.number)):
            return {
                "type": "number",
                "data": float(result)
            }
        
        # String
        elif isinstance(result, str):
            return {
                "type": "string",
                "data": result
            }
        
        # Default
        else:
            return {
                "type": "unknown",
                "data": str(result)
            }
