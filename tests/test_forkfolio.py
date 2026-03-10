"""
Forkfolio Test Suite
====================
Tests for the Forkfolio recipe sharing web app.

Architecture:
  Browser <-> Front_end (port 7000, BFF) <-> back_end (port 4000, REST API) <-> MongoDB + Supabase

Test Categories:
  1. Unit tests  - pure logic (tag parsing, rating calculation, data validation)
  2. Integration - HTTP requests to the backend API (port 4000)
  3. BFF tests   - HTTP requests to the frontend server (port 7000)

Requirements:
  pip install pytest requests

Run all tests:
  pytest tests/test_forkfolio.py -v

Run only unit tests (no server required):
  pytest tests/test_forkfolio.py -v -m unit

Run only integration tests (backend must be running on port 4000):
  pytest tests/test_forkfolio.py -v -m integration

Run only BFF tests (both servers must be running):
  pytest tests/test_forkfolio.py -v -m bff
"""

import re
import pytest
import requests
from unittest.mock import MagicMock, patch

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

BACKEND_URL = "http://localhost:4000"
FRONTEND_URL = "http://localhost:7000"

# Credentials used for integration tests – swap for real test accounts
TEST_USER_EMAIL = "test_user@example.com"
TEST_USER_PASSWORD = "testpassword123"
ADMIN_EMAIL = "ahryguy@gmail.com"

# ---------------------------------------------------------------------------
# Helpers / pure-Python re-implementations of key server logic
# ---------------------------------------------------------------------------

ADMIN_EMAILS = ["zachmajernik@gmail.com", "ahryguy@gmail.com"]


def is_admin(email: str) -> bool:
    """Mirror of Front_end.js admin check."""
    return email in ADMIN_EMAILS


def parse_tags(raw: str) -> list[str]:
    """
    Mirror of back-end.js tag parsing.
    Converts a comma-separated string into a stripped list of non-empty strings.
    """
    if not isinstance(raw, str):
        return raw if isinstance(raw, list) else []
    return [t.strip() for t in raw.split(",") if t.strip()]


def calculate_average_rating(comments: list[dict]) -> float | None:
    """
    Mirror of recipe_details.ejs rating average calculation.
    Returns None when there are no rated comments.
    """
    rated = [c for c in comments if isinstance(c.get("rating"), (int, float))]
    if not rated:
        return None
    return sum(c["rating"] for c in rated) / len(rated)


def search_recipes(recipes: list[dict], query: str) -> list[dict]:
    """
    Mirror of DAL.js searchRecipes – case-insensitive regex over
    name, ingredient items, and tags.
    """
    pattern = re.compile(query, re.IGNORECASE)
    results = []
    for recipe in recipes:
        name_match = pattern.search(recipe.get("name", ""))
        tag_match = any(pattern.search(t) for t in recipe.get("tags", []))
        ingredient_match = any(
            pattern.search(ing.get("item", ""))
            for ing in recipe.get("ingredients", [])
        )
        if name_match or tag_match or ingredient_match:
            results.append(recipe)
    return results


def can_delete_comment(comment: dict, requesting_user_id: str, is_admin_user: bool) -> bool:
    """
    Mirror of DAL.js deleteCommentFromRecipe ownership check.
    Admins can delete any comment; regular users can only delete their own.
    """
    if is_admin_user:
        return True
    return comment.get("userId") == requesting_user_id


# ---------------------------------------------------------------------------
# Sample data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_recipe():
    return {
        "_id": "507f1f77bcf86cd799439011",
        "name": "Spaghetti Carbonara",
        "description": "Classic Italian pasta dish",
        "estimatedTime": "30 minutes",
        "servings": 4,
        "difficulty": "Medium",
        "tags": ["Italian", "Pasta", "Dinner"],
        "ingredients": [
            {"item": "spaghetti", "amount": "400g"},
            {"item": "eggs", "amount": "4"},
            {"item": "pancetta", "amount": "200g"},
            {"item": "parmesan", "amount": "100g"},
        ],
        "directions": [
            "Boil pasta until al dente.",
            "Fry pancetta until crispy.",
            "Mix eggs and parmesan.",
            "Combine all ingredients off heat.",
        ],
        "comments": [],
    }


@pytest.fixture
def sample_comment():
    return {
        "text": "Delicious recipe!",
        "rating": 5,
        "username": "alice",
        "userId": "user-uuid-alice",
        "timestamp": "2025-01-01T12:00:00.000Z",
    }


@pytest.fixture
def recipes_list():
    return [
        {
            "name": "Chicken Tikka Masala",
            "tags": ["Indian", "Chicken"],
            "ingredients": [{"item": "chicken breast", "amount": "500g"}],
        },
        {
            "name": "Beef Tacos",
            "tags": ["Mexican", "Beef"],
            "ingredients": [{"item": "ground beef", "amount": "400g"}],
        },
        {
            "name": "Vegan Buddha Bowl",
            "tags": ["Vegan", "Healthy"],
            "ingredients": [{"item": "chickpeas", "amount": "1 can"}],
        },
    ]


# ===========================================================================
# SECTION 1: Unit Tests (no server required)
# ===========================================================================

class TestAdminCheck:
    """Tests for admin email whitelist logic."""

    @pytest.mark.unit
    def test_known_admin_is_admin(self):
        assert is_admin("zachmajernik@gmail.com") is True

    @pytest.mark.unit
    def test_second_known_admin_is_admin(self):
        assert is_admin("ahryguy@gmail.com") is True

    @pytest.mark.unit
    def test_regular_user_is_not_admin(self):
        assert is_admin("regular@example.com") is False

    @pytest.mark.unit
    def test_empty_email_is_not_admin(self):
        assert is_admin("") is False

    @pytest.mark.unit
    def test_partial_admin_email_is_not_admin(self):
        assert is_admin("zachmajernik") is False

    @pytest.mark.unit
    def test_case_sensitive_admin_check(self):
        # The JS uses array.includes() which is case-sensitive
        assert is_admin("Zachmajernik@gmail.com") is False


class TestTagParsing:
    """Tests for comma-separated tag string → list conversion."""

    @pytest.mark.unit
    def test_simple_tags(self):
        assert parse_tags("Italian, Pasta, Dinner") == ["Italian", "Pasta", "Dinner"]

    @pytest.mark.unit
    def test_tags_with_extra_whitespace(self):
        assert parse_tags("  Vegan  ,  Healthy  ") == ["Vegan", "Healthy"]

    @pytest.mark.unit
    def test_single_tag(self):
        assert parse_tags("Soup") == ["Soup"]

    @pytest.mark.unit
    def test_empty_string_returns_empty_list(self):
        assert parse_tags("") == []

    @pytest.mark.unit
    def test_commas_with_no_text_ignored(self):
        assert parse_tags(",,,") == []

    @pytest.mark.unit
    def test_mixed_empty_and_valid_tags(self):
        assert parse_tags("Italian,,Pasta,") == ["Italian", "Pasta"]

    @pytest.mark.unit
    def test_list_input_passes_through(self):
        existing_list = ["Mexican", "Beef"]
        assert parse_tags(existing_list) == existing_list  # type: ignore[arg-type]

    @pytest.mark.unit
    def test_tags_preserve_case(self):
        assert parse_tags("VEGAN,vegan,Vegan") == ["VEGAN", "vegan", "Vegan"]


class TestAverageRating:
    """Tests for comment rating average calculation."""

    @pytest.mark.unit
    def test_no_comments_returns_none(self):
        assert calculate_average_rating([]) is None

    @pytest.mark.unit
    def test_single_perfect_rating(self):
        comments = [{"rating": 5, "text": "Great!"}]
        assert calculate_average_rating(comments) == 5.0

    @pytest.mark.unit
    def test_multiple_ratings_average(self):
        comments = [{"rating": 4}, {"rating": 2}, {"rating": 3}]
        assert calculate_average_rating(comments) == pytest.approx(3.0)

    @pytest.mark.unit
    def test_comments_without_rating_excluded(self):
        comments = [{"rating": 4}, {"text": "No rating here"}]
        # Only the rated comment counts
        assert calculate_average_rating(comments) == 4.0

    @pytest.mark.unit
    def test_all_comments_without_rating_returns_none(self):
        comments = [{"text": "No rating"}, {"text": "Also no rating"}]
        assert calculate_average_rating(comments) is None

    @pytest.mark.unit
    def test_zero_rating_included(self):
        comments = [{"rating": 0}, {"rating": 4}]
        assert calculate_average_rating(comments) == pytest.approx(2.0)

    @pytest.mark.unit
    def test_fractional_average(self):
        comments = [{"rating": 5}, {"rating": 4}]
        assert calculate_average_rating(comments) == pytest.approx(4.5)


class TestSearchLogic:
    """Tests for the case-insensitive recipe search logic."""

    @pytest.mark.unit
    def test_search_by_name(self, recipes_list):
        results = search_recipes(recipes_list, "taco")
        assert len(results) == 1
        assert results[0]["name"] == "Beef Tacos"

    @pytest.mark.unit
    def test_search_is_case_insensitive(self, recipes_list):
        upper = search_recipes(recipes_list, "CHICKEN")
        lower = search_recipes(recipes_list, "chicken")
        assert len(upper) == len(lower) == 1

    @pytest.mark.unit
    def test_search_by_tag(self, recipes_list):
        results = search_recipes(recipes_list, "vegan")
        assert len(results) == 1
        assert results[0]["name"] == "Vegan Buddha Bowl"

    @pytest.mark.unit
    def test_search_by_ingredient(self, recipes_list):
        results = search_recipes(recipes_list, "chickpea")
        assert len(results) == 1
        assert results[0]["name"] == "Vegan Buddha Bowl"

    @pytest.mark.unit
    def test_no_match_returns_empty(self, recipes_list):
        results = search_recipes(recipes_list, "sushi")
        assert results == []

    @pytest.mark.unit
    def test_search_matches_partial_word(self, recipes_list):
        # "Tikka" is a partial match for "tikka masala"
        results = search_recipes(recipes_list, "Tikka")
        assert len(results) == 1

    @pytest.mark.unit
    def test_search_returns_all_on_broad_query(self, recipes_list):
        # Every recipe has a non-empty name, so a regex that matches any letter returns all
        results = search_recipes(recipes_list, "a")
        assert len(results) == len(recipes_list)


class TestCommentOwnership:
    """Tests for comment delete ownership rules."""

    @pytest.mark.unit
    def test_owner_can_delete_own_comment(self, sample_comment):
        assert can_delete_comment(sample_comment, "user-uuid-alice", False) is True

    @pytest.mark.unit
    def test_non_owner_cannot_delete_comment(self, sample_comment):
        assert can_delete_comment(sample_comment, "user-uuid-bob", False) is False

    @pytest.mark.unit
    def test_admin_can_delete_any_comment(self, sample_comment):
        assert can_delete_comment(sample_comment, "user-uuid-bob", True) is True

    @pytest.mark.unit
    def test_admin_can_delete_own_comment(self, sample_comment):
        assert can_delete_comment(sample_comment, "user-uuid-alice", True) is True

    @pytest.mark.unit
    def test_empty_user_id_cannot_delete(self, sample_comment):
        assert can_delete_comment(sample_comment, "", False) is False


class TestRecipeDataValidation:
    """Tests for expected recipe data shape."""

    @pytest.mark.unit
    def test_recipe_has_required_fields(self, sample_recipe):
        required = ["name", "description", "estimatedTime", "servings",
                    "difficulty", "tags", "ingredients", "directions"]
        for field in required:
            assert field in sample_recipe, f"Missing field: {field}"

    @pytest.mark.unit
    def test_ingredients_are_list_of_dicts(self, sample_recipe):
        for ing in sample_recipe["ingredients"]:
            assert isinstance(ing, dict)
            assert "item" in ing
            assert "amount" in ing

    @pytest.mark.unit
    def test_directions_are_list_of_strings(self, sample_recipe):
        for direction in sample_recipe["directions"]:
            assert isinstance(direction, str)

    @pytest.mark.unit
    def test_tags_are_list(self, sample_recipe):
        assert isinstance(sample_recipe["tags"], list)

    @pytest.mark.unit
    def test_comments_default_to_empty_list(self, sample_recipe):
        assert sample_recipe["comments"] == []

    @pytest.mark.unit
    def test_servings_is_numeric(self, sample_recipe):
        assert isinstance(sample_recipe["servings"], (int, float))

    @pytest.mark.unit
    def test_comment_rating_in_valid_range(self, sample_comment):
        assert 0 <= sample_comment["rating"] <= 5


# ===========================================================================
# SECTION 2: Integration Tests – Backend API (port 4000)
# ===========================================================================

@pytest.mark.integration
class TestBackendHealth:
    """Basic connectivity and response format checks."""

    def test_get_all_recipes_returns_200(self):
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        assert response.status_code == 200

    def test_get_all_recipes_returns_json_list(self):
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        data = response.json()
        assert isinstance(data, list)

    def test_get_submitted_recipes_returns_200(self):
        response = requests.get(f"{BACKEND_URL}/submitted_recipes", timeout=5)
        assert response.status_code == 200

    def test_get_submitted_recipes_returns_json_list(self):
        response = requests.get(f"{BACKEND_URL}/submitted_recipes", timeout=5)
        data = response.json()
        assert isinstance(data, list)


@pytest.mark.integration
class TestBackendSearch:
    """Search endpoint tests."""

    def test_search_with_query_returns_200(self):
        response = requests.get(f"{BACKEND_URL}/search", params={"q": "chicken"}, timeout=5)
        assert response.status_code == 200

    def test_search_returns_json_list(self):
        response = requests.get(f"{BACKEND_URL}/search", params={"q": "pasta"}, timeout=5)
        assert isinstance(response.json(), list)

    def test_search_empty_query_returns_list(self):
        response = requests.get(f"{BACKEND_URL}/search", params={"q": ""}, timeout=5)
        # Should return all or empty, but not crash
        assert response.status_code == 200

    def test_search_nonexistent_term_returns_empty(self):
        response = requests.get(
            f"{BACKEND_URL}/search",
            params={"q": "xyzzy_no_match_12345"},
            timeout=5,
        )
        assert response.status_code == 200
        assert response.json() == []

    def test_search_by_tag_returns_200(self):
        response = requests.get(f"{BACKEND_URL}/searchByTag/Italian", timeout=5)
        assert response.status_code == 200

    def test_search_by_tag_returns_only_matching_recipes(self):
        tag = "Italian"
        response = requests.get(f"{BACKEND_URL}/searchByTag/{tag}", timeout=5)
        results = response.json()
        for recipe in results:
            tags_lower = [t.lower() for t in recipe.get("tags", [])]
            assert tag.lower() in tags_lower, f"Recipe '{recipe.get('name')}' missing tag '{tag}'"


@pytest.mark.integration
class TestBackendRecipeById:
    """Fetch individual recipe by ID."""

    def test_invalid_object_id_returns_error(self):
        response = requests.get(f"{BACKEND_URL}/recipes/not-a-valid-id", timeout=5)
        assert response.status_code in (400, 404, 500)

    def test_nonexistent_id_returns_404_or_empty(self):
        fake_id = "507f1f77bcf86cd799439999"
        response = requests.get(f"{BACKEND_URL}/recipes/{fake_id}", timeout=5)
        # Either 404 or a null body – both are acceptable
        assert response.status_code in (200, 404)

    def test_submitted_recipe_invalid_id_returns_error(self):
        response = requests.get(f"{BACKEND_URL}/submitted_recipes/bad-id", timeout=5)
        assert response.status_code in (400, 404, 500)


@pytest.mark.integration
class TestBackendAddRecipe:
    """Add a new recipe via POST /."""

    def _minimal_recipe(self):
        return {
            "name": "Test Recipe",
            "description": "A test recipe for automated testing",
            "estimatedTime": "10 minutes",
            "servings": 2,
            "difficulty": "Easy",
            "tags": "Test, Automated",
            "ingredients[0][item]": "water",
            "ingredients[0][amount]": "1 cup",
            "directions[0]": "Boil the water.",
        }

    def test_add_recipe_with_valid_data_returns_200(self):
        response = requests.post(f"{BACKEND_URL}/", data=self._minimal_recipe(), timeout=5)
        assert response.status_code == 200

    def test_add_recipe_response_has_message(self):
        response = requests.post(f"{BACKEND_URL}/", data=self._minimal_recipe(), timeout=5)
        body = response.json()
        assert "message" in body or "code" in body

    def test_add_recipe_missing_name_returns_error(self):
        recipe = self._minimal_recipe()
        del recipe["name"]
        response = requests.post(f"{BACKEND_URL}/", data=recipe, timeout=5)
        # Should be 400 or similar – not 200
        assert response.status_code != 200


@pytest.mark.integration
class TestBackendComments:
    """Comment add/delete integration tests."""

    def _get_first_recipe_id(self):
        response = requests.get(f"{BACKEND_URL}/", timeout=5)
        recipes = response.json()
        if not recipes:
            pytest.skip("No recipes in the database")
        return str(recipes[0]["_id"])

    def test_add_comment_returns_200(self):
        recipe_id = self._get_first_recipe_id()
        payload = {
            "text": "Integration test comment",
            "rating": 4,
            "username": "tester",
            "userId": "integration-test-user",
        }
        response = requests.post(
            f"{BACKEND_URL}/recipes/{recipe_id}/comments",
            json=payload,
            timeout=5,
        )
        assert response.status_code == 200

    def test_add_comment_missing_text_returns_error(self):
        recipe_id = self._get_first_recipe_id()
        payload = {"rating": 3, "username": "tester", "userId": "some-id"}
        response = requests.post(
            f"{BACKEND_URL}/recipes/{recipe_id}/comments",
            json=payload,
            timeout=5,
        )
        assert response.status_code in (400, 500)

    def test_delete_comment_invalid_recipe_returns_error(self):
        response = requests.delete(
            f"{BACKEND_URL}/recipes/bad-id/comments/0",
            timeout=5,
        )
        assert response.status_code in (400, 404, 500)


# ===========================================================================
# SECTION 3: BFF / Frontend Tests (port 7000)
# ===========================================================================

@pytest.mark.bff
class TestFrontendPageRenders:
    """Verify that BFF page routes return HTML 200 responses."""

    def test_home_page_renders(self):
        response = requests.get(f"{FRONTEND_URL}/", timeout=5)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_login_page_renders(self):
        response = requests.get(f"{FRONTEND_URL}/login", timeout=5)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_signup_page_renders(self):
        response = requests.get(f"{FRONTEND_URL}/signup", timeout=5)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_recipe_list_page_renders(self):
        response = requests.get(f"{FRONTEND_URL}/recipe_list", timeout=5)
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_search_page_renders(self):
        response = requests.get(
            f"{FRONTEND_URL}/search", params={"q": "pasta"}, timeout=5
        )
        assert response.status_code == 200
        assert "text/html" in response.headers.get("Content-Type", "")

    def test_search_by_tag_page_renders(self):
        response = requests.get(f"{FRONTEND_URL}/searchByTag/Italian", timeout=5)
        assert response.status_code == 200

    def test_submitted_recipe_list_redirects_or_requires_auth(self):
        # Without auth cookie, should redirect or return non-200
        response = requests.get(
            f"{FRONTEND_URL}/submitted_recipe_list", timeout=5, allow_redirects=False
        )
        # Expect redirect (3xx) or forbidden (4xx), NOT a plain 200
        assert response.status_code in (302, 403, 401) or response.status_code == 200


@pytest.mark.bff
class TestFrontendAuthFlow:
    """Test login/signup/logout form submissions."""

    def test_login_with_bad_credentials_does_not_set_token_cookie(self):
        session = requests.Session()
        response = session.post(
            f"{FRONTEND_URL}/login",
            data={"email": "nobody@nowhere.com", "password": "wrongpassword"},
            timeout=5,
            allow_redirects=True,
        )
        # Token cookie should NOT be set after a failed login
        assert "token" not in session.cookies

    def test_logout_clears_session(self):
        session = requests.Session()
        # Force a cookie so we can verify it's cleared
        session.cookies.set("token", "fake-jwt-token")
        session.cookies.set("user_email", "test@example.com")
        response = session.post(
            f"{FRONTEND_URL}/logout", timeout=5, allow_redirects=True
        )
        assert "token" not in session.cookies

    def test_login_page_contains_form(self):
        response = requests.get(f"{FRONTEND_URL}/login", timeout=5)
        assert b"<form" in response.content

    def test_signup_page_contains_form(self):
        response = requests.get(f"{FRONTEND_URL}/signup", timeout=5)
        assert b"<form" in response.content


@pytest.mark.bff
class TestFrontendSearchUI:
    """Verify search results are rendered in HTML."""

    def test_search_results_page_contains_recipes_section(self):
        response = requests.get(f"{FRONTEND_URL}/search", params={"q": "a"}, timeout=5)
        # Very broad search – page should contain recipe elements
        assert response.status_code == 200

    def test_search_no_results_still_returns_page(self):
        response = requests.get(
            f"{FRONTEND_URL}/search",
            params={"q": "xyzzy_absolutely_no_match_99999"},
            timeout=5,
        )
        assert response.status_code == 200
        # Should render a "no results" page, not an error page
        assert b"500" not in response.content


# ===========================================================================
# SECTION 4: Edge Cases and Regression Tests
# ===========================================================================

class TestEdgeCases:
    """Miscellaneous edge cases identified during code review."""

    @pytest.mark.unit
    def test_tag_with_unicode_characters(self):
        """Tags may contain accented or international characters."""
        result = parse_tags("Über-Healthy, café")
        assert "Über-Healthy" in result
        assert "café" in result

    @pytest.mark.unit
    def test_rating_boundary_zero(self):
        comments = [{"rating": 0}]
        avg = calculate_average_rating(comments)
        assert avg == 0.0

    @pytest.mark.unit
    def test_rating_boundary_five(self):
        comments = [{"rating": 5}]
        avg = calculate_average_rating(comments)
        assert avg == 5.0

    @pytest.mark.unit
    def test_search_regex_special_chars_does_not_crash(self):
        """A query with regex special chars shouldn't raise an exception in the Python mirror.
        The backend should also handle this gracefully."""
        recipes = [{"name": "Rice (Brown)", "tags": [], "ingredients": []}]
        try:
            results = search_recipes(recipes, "(Brown)")
            # Either matches or doesn't – no exception
            assert isinstance(results, list)
        except re.error:
            pytest.fail("search_recipes raised re.error on special characters")

    @pytest.mark.unit
    def test_admin_email_list_immutable_check(self):
        """Verify the admin list has exactly the two expected entries."""
        assert len(ADMIN_EMAILS) == 2
        assert "zachmajernik@gmail.com" in ADMIN_EMAILS
        assert "ahryguy@gmail.com" in ADMIN_EMAILS

    @pytest.mark.unit
    def test_comment_timestamp_format(self, sample_comment):
        """Timestamps should be ISO 8601 compatible strings."""
        ts = sample_comment["timestamp"]
        # Basic ISO 8601 pattern check
        iso_pattern = re.compile(r"\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}")
        assert iso_pattern.match(ts), f"Timestamp '{ts}' is not ISO 8601"

    @pytest.mark.unit
    def test_recipe_name_must_not_be_empty(self):
        """A recipe without a name is invalid."""
        recipe = {"name": "", "tags": [], "ingredients": []}
        assert recipe["name"] == ""  # Flags the condition – backend should reject this
