import { beforeEach, describe, expect, rs, test } from "@rstest/core";

let mockCreate: ReturnType<typeof rs.fn>;
let mockGetById: ReturnType<typeof rs.fn>;
let mockUpdate: ReturnType<typeof rs.fn>;
let mockDoSearch: ReturnType<typeof rs.fn>;

beforeEach(() => {
  rs.resetModules();

  mockCreate = rs.fn();
  mockGetById = rs.fn();
  mockUpdate = rs.fn();
  mockDoSearch = rs.fn();

  rs.doMock("~/env", () => ({
    env: {
      HUBSPOT_ACCESS_TOKEN: "test-token",
      HUBSPOT_CLIENT_SECRET: "test-secret",
    },
  }));

  rs.doMock("../client", () => ({
    hubspot: {
      crm: {
        contacts: {
          basicApi: {
            create: mockCreate,
            getById: mockGetById,
            update: mockUpdate,
          },
          searchApi: {
            doSearch: mockDoSearch,
          },
        },
      },
    },
  }));
});

const MOCK_RESPONSE = {
  id: "123",
  properties: {
    firstname: "Jane",
    lastname: "Doe",
    email: "jane@example.com",
  },
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-02"),
};

describe("createContact", () => {
  test("calls basicApi.create and maps response", async () => {
    mockCreate.mockResolvedValue(MOCK_RESPONSE);

    const { createContact } = await import("../contacts");
    const result = await createContact({ firstname: "Jane", lastname: "Doe" });

    expect(mockCreate).toHaveBeenCalledWith({
      properties: { firstname: "Jane", lastname: "Doe" },
      associations: [],
    });
    expect(result.id).toBe("123");
    expect(result.properties.firstname).toBe("Jane");
  });
});

describe("getContact", () => {
  test("calls basicApi.getById with all properties", async () => {
    const { ALL_PROPERTIES } = await import("../properties");
    mockGetById.mockResolvedValue(MOCK_RESPONSE);

    const { getContact } = await import("../contacts");
    const result = await getContact("123");

    expect(mockGetById).toHaveBeenCalledWith("123", ALL_PROPERTIES);
    expect(result.id).toBe("123");
  });
});

describe("updateContact", () => {
  test("calls basicApi.update and maps response", async () => {
    const updatedResponse = {
      ...MOCK_RESPONSE,
      properties: { ...MOCK_RESPONSE.properties, phone: "0400000000" },
    };
    mockUpdate.mockResolvedValue(updatedResponse);

    const { updateContact } = await import("../contacts");
    const result = await updateContact("123", { phone: "0400000000" });

    expect(mockUpdate).toHaveBeenCalledWith("123", {
      properties: { phone: "0400000000" },
    });
    expect(result.id).toBe("123");
    expect(result.properties.phone).toBe("0400000000");
  });
});

describe("searchContacts", () => {
  test("calls searchApi.doSearch and maps results", async () => {
    mockDoSearch.mockResolvedValue({
      results: [MOCK_RESPONSE],
    });

    const { searchContacts } = await import("../contacts");
    const results = await searchContacts("jane@example.com");

    expect(results).toHaveLength(1);
    expect(results[0]!.properties.email).toBe("jane@example.com");
  });
});

describe("findExistingContact", () => {
  test("finds contact by email first", async () => {
    mockDoSearch.mockResolvedValue({ results: [MOCK_RESPONSE] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact("jane@example.com", "0400000000");

    expect(result?.id).toBe("123");
    expect(mockDoSearch).toHaveBeenCalledTimes(1);
    expect(mockDoSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "email",
                operator: "EQ",
                value: "jane@example.com",
              },
            ],
          },
        ],
      }),
    );
  });

  test("falls back to phone when no email match", async () => {
    mockDoSearch
      .mockResolvedValueOnce({ results: [] })
      .mockResolvedValueOnce({ results: [MOCK_RESPONSE] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact(
      "nobody@example.com",
      "0400000000",
    );

    expect(result?.id).toBe("123");
    expect(mockDoSearch).toHaveBeenCalledTimes(2);
  });

  test("returns null when no match found", async () => {
    mockDoSearch.mockResolvedValue({ results: [] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact(
      "nobody@example.com",
      "0000000000",
    );

    expect(result).toBeNull();
  });

  test("skips email search when email is null", async () => {
    mockDoSearch.mockResolvedValue({ results: [MOCK_RESPONSE] });

    const { findExistingContact } = await import("../contacts");
    const result = await findExistingContact(null, "0400000000");

    expect(result?.id).toBe("123");
    expect(mockDoSearch).toHaveBeenCalledTimes(1);
    expect(mockDoSearch).toHaveBeenCalledWith(
      expect.objectContaining({
        filterGroups: [
          {
            filters: [
              {
                propertyName: "phone",
                operator: "EQ",
                value: "0400000000",
              },
            ],
          },
        ],
      }),
    );
  });
});
