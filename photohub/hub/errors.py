from django.http import JsonResponse

# Errors
def ErrorResponse(code, status, message, details="", context={}):
    return JsonResponse({"ERROR": code, "message": message, "details": details, "context": context}, status=status)

def ErrorUnexpected(**kwarg):
    default_args = {"code": "Unexpected",
                    "status": 500,
                    "message": "Internal server error"}
    final_args = {**default_args, **kwarg}
    return ErrorResponse(**final_args)

def ErrorAuthRequired(**kwarg):
    default_args = {"code": "AuthRequired",
                    "status": 401,
                    "message": "Authentification required"}
    final_args = {**default_args, **kwarg}
    return ErrorResponse(**final_args)

def ErrorLoginFail(**kwarg):
    default_args = {"code": "LoginFail",
                    "status": 449,
                    "message": "Login fail",
                    "details": "Information provided incorrect"}
    final_args = {**default_args, **kwarg}
    return ErrorResponse(**final_args)

def ErrorRequest(**kwarg):
    default_args = {"code": "ErrorRequest",
                    "status": 400,
                    "message": "Unable to decode the request"}
    final_args = {**default_args, **kwarg}
    return ErrorResponse(**final_args)
