from fastapi.testclient import TestClient
from src.app import app, activities

client = TestClient(app)


def test_get_activities_returns_200_and_payload():
    res = client.get("/activities")
    assert res.status_code == 200
    data = res.json()
    assert isinstance(data, dict)
    # ensure a known activity exists
    assert "Chess Club" in data


def test_signup_and_duplicate_signup_and_delete():
    activity = "Chess Club"
    email = "test_student@example.com"

    # Ensure email not present initially
    if email in activities[activity]["participants"]:
        activities[activity]["participants"].remove(email)

    # Signup should succeed
    res = client.post(f"/activities/{activity}/signup?email={email}")
    assert res.status_code == 200
    assert f"Signed up {email} for {activity}" in res.json().get("message", "")
    assert email in activities[activity]["participants"]

    # Duplicate signup should return 400
    res2 = client.post(f"/activities/{activity}/signup?email={email}")
    assert res2.status_code == 400

    # Delete/unregister should succeed
    res3 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res3.status_code == 200
    assert email not in activities[activity]["participants"]

    # Deleting again should return 404
    res4 = client.delete(f"/activities/{activity}/participants?email={email}")
    assert res4.status_code == 404
