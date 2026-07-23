"""Pytest test suite for user registration, validation rules, JWT authentication, and token refresh."""


def test_email_and_password_validation(client):
    """Tests registration validation constraints for invalid email formats and weak passwords."""
    # 1. Invalid email missing '@' or domain
    res_bad_email = client.post(
        "/api/v1/auth/register",
        json={"email": "invalidemail.com", "password": "SecurePassword123!"},
    )
    assert res_bad_email.status_code == 422

    # 2. Password missing uppercase
    res_no_upper = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "password": "securepassword123!"},
    )
    assert res_no_upper.status_code == 422

    # 3. Password missing digit
    res_no_digit = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "password": "SecurePassword!"},
    )
    assert res_no_digit.status_code == 422

    # 4. Password missing special character
    res_no_special = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "password": "SecurePassword123"},
    )
    assert res_no_special.status_code == 422

    # 5. Password too short (< 8 chars)
    res_short = client.post(
        "/api/v1/auth/register",
        json={"email": "valid@example.com", "password": "Sec1!"},
    )
    assert res_short.status_code == 422


def test_register_login_and_refresh_flow(client):
    """Tests full authentication flow: registration, duplicate prevention, JWT login, profile fetching, and token refresh."""
    register_payload = {
        "email": "authuser@getfit.com",
        "password": "SecurePassword123!",
    }

    # 1. Test Register
    response = client.post("/api/v1/auth/register", json=register_payload)
    assert response.status_code == 201, response.text
    data = response.json()
    assert data["email"] == "authuser@getfit.com"
    assert data["is_active"] is True

    # 2. Test Register Duplicate fails
    response_dup = client.post("/api/v1/auth/register", json=register_payload)
    assert response_dup.status_code == 400

    # 3. Test Login
    login_payload = {
        "email": "authuser@getfit.com",
        "password": "SecurePassword123!",
    }
    response_login = client.post("/api/v1/auth/login", json=login_payload)
    assert response_login.status_code == 200
    tokens = response_login.json()
    assert "access_token" in tokens
    assert "refresh_token" in tokens

    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 4. Test Get Me (Authenticated)
    response_me = client.get("/api/v1/users/me", headers=headers)
    assert response_me.status_code == 200
    me_data = response_me.json()
    assert me_data["email"] == "authuser@getfit.com"

    # 5. Test Refresh Token
    refresh_payload = {"refresh_token": refresh_token}
    response_refresh = client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response_refresh.status_code == 200
    new_tokens = response_refresh.json()
    assert "access_token" in new_tokens
    assert "refresh_token" in new_tokens
    assert new_tokens["access_token"] != access_token

    # 6. Test Old Refresh Token is Revoked
    response_old_refresh = client.post("/api/v1/auth/refresh", json=refresh_payload)
    assert response_old_refresh.status_code == 401
