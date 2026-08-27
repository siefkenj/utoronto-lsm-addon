import { localFetch, log, makePromiseThreadsafe } from "../utils";
import type { ExtractedKeys } from "./extract-keys";
import { extractKeysFromLsmPage } from "./extract-keys";

export interface RoomInfo {
    building: string;
    room: string;
    capacity: number | null;
    /**
     * A secondary, smaller capacity (e.g. a reduced testing/exam capacity),
     * if the LSM page reports more than one capacity for the room.
     */
    testingCapacity?: number | null;
    photos: string[];
    roomLayout: string | null;
}

/**
 * Format a room's capacity for display. Filtering always uses the larger
 * `capacity` value; if a smaller secondary capacity is also known, it's
 * shown in parentheses alongside it.
 */
export function formatCapacity(
    room: Pick<RoomInfo, "capacity" | "testingCapacity">
): string {
    const { capacity, testingCapacity } = room;
    if (capacity == null) {
        return "unknown";
    }
    if (testingCapacity != null && testingCapacity < capacity) {
        return `${capacity} (${testingCapacity})`;
    }
    return `${capacity}`;
}
/**
 * Fetch a list of all buildings.
 */
export async function fetchBuildings(pageVars: ExtractedKeys) {
    const body = new URLSearchParams({
        p_flow_id: "162",
        p_flow_step_id: "1",
        p_instance: pageVars.pInstance,
        p_request: `PLUGIN=${pageVars.ajaxIdentifiers.BLDG}`,
        p_json: JSON.stringify({
            pageItems: {
                itemsToSubmit: [
                    { n: "BLDG", v: "" },
                    { n: "ROOM", v: "" },
                ],
                protected: pageVars.pPageItemsProtected,
                rowVersion: "",
                formRegionChecksums: [],
            },
            salt: pageVars.pSalt,
        }),
    });
    const url = "" + new URL("/ords/wwv_flow.ajax", window.location.href);
    const resp = await localFetch(url, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
        body: body,
        credentials: "include",
        mode: "cors",
    });
    const buildings = await resp.json();

    return Object.fromEntries(
        buildings.values.map((x: { r: string; d: string }) => [x.r, x.d])
    ) as Record<string, string>;
}

/**
 * Fetch a list of rooms in a particular building.
 */
export async function fetchRoomsForBuilding(
    building: string,
    pageVars: ExtractedKeys
) {
    const body = new URLSearchParams({
        p_flow_id: "162",
        p_flow_step_id: "1",
        p_instance: pageVars.pInstance,
        p_request: `PLUGIN=${pageVars.ajaxIdentifiers.ROOM}`,
        p_json: JSON.stringify({
            pageItems: {
                itemsToSubmit: [
                    { n: "BLDG", v: building },
                    { n: "ROOM", v: "" },
                ],
                protected: pageVars.pPageItemsProtected,
                rowVersion: "",
            },
            salt: pageVars.pSalt,
        }),
    });
    const url = "" + new URL("/ords/wwv_flow.ajax", window.location.href);
    const resp = await localFetch(url, {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        },
        method: "POST",
        body: body,
        credentials: "include",
        mode: "cors",
    });
    const rooms = await resp.json();

    return rooms.values.map((x: { r: string; d: string }) => x.r) as string[];
}

/**
 * Fetch details about a specific room (like capacity, photos, etc.)
 */
async function _fetchRoomDetails(building: string, room: string) {
    log("Fetching room details for", building, room);

    let resp = await localFetch(
        "https://lsm.utoronto.ca/webapp/f?p=210:1:::NO:::"
    );
    const pageVars = extractKeysFromLsmPage(await resp.text());

    const body = new URLSearchParams({
        p_flow_id: "210",
        p_flow_step_id: "1",
        p_instance: pageVars.pInstance,
        p_request: "P1_ROOM",
        p_page_submission_id: pageVars.pPageSubmissionId,
        p_json: JSON.stringify({
            salt: pageVars.pSalt,
            pageItems: {
                itemsToSubmit: [
                    { n: "P1_BLDG", v: building },
                    { n: "P1_ROOM", v: room },
                    pageVars.P1_DISPLAY_OBJ,
                ],
                protected: pageVars.pPageItemsProtected,
                rowVersion: "",
            },
        }),
        p_reload_on_submit: "A",
    });
    resp = await localFetch("https://lsm.utoronto.ca/webapp/wwv_flow.accept", {
        headers: {
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
        },
        method: "POST",
        body: body,
    });
    const roomDetailsHtml = await resp.text();
    const parser = new DOMParser();
    const doc = parser.parseFromString(roomDetailsHtml, "text/html");

    // Search for important information like room capacity, etc. The LSM page
    // has changed its label before (e.g. "Capacity" -> "Room Capacity"), and
    // it can list more than one capacity (e.g. a reduced "Testing Capacity"
    // alongside the normal "Room Capacity"). Match any label ending in
    // "Capacity" rather than an exact string so relabeling doesn't silently
    // break this again; use the largest value found for filtering, and treat
    // any smaller one as a secondary capacity.
    const capacityValues = Array.from(doc.querySelectorAll("td"))
        .filter((td) => /Capacity$/.test(td.textContent?.trim() ?? ""))
        .map((td) => {
            const valueStr = td.nextElementSibling?.textContent?.trim();
            return valueStr ? parseInt(valueStr, 10) : NaN;
        })
        .filter((n) => !Number.isNaN(n));
    const capacity =
        capacityValues.length > 0 ? Math.max(...capacityValues) : null;
    const testingCapacity =
        capacityValues.length > 1 ? Math.min(...capacityValues) : null;
    const photos = (
        Array.from(doc.querySelectorAll("img[src*=Room]")) as HTMLImageElement[]
    ).map((x) => x.src);
    const roomLayout =
        (doc.querySelector("a[href*=RoomPlansPDF]") as HTMLAnchorElement)
            ?.href || null;

    return {
        building,
        room,
        capacity,
        testingCapacity,
        photos,
        roomLayout,
    };
}
/**
 * Fetch details about a specific room (like capacity, photos, etc.). This function
 * returns an atomic promise (i.e., concurrent promises will not be resolved in parallel.)
 */
export const fetchRoomDetails = makePromiseThreadsafe(_fetchRoomDetails);

export async function fetchRoomInfoForAllBuildings() {
    let resp = await localFetch(
        "https://lsm.utoronto.ca/ords/f?p=162:101::BRANCH_TO_PAGE_ACCEPT::::"
    );
    const pageVars = extractKeysFromLsmPage(await resp.text());
    const buildings = await fetchBuildings(pageVars);
    const buildingInfo = await Promise.all(
        Object.entries(buildings).map(async ([building, buildingName]) => {
            return {
                building,
                buildingName,
                rooms: await fetchRoomsForBuilding(building, pageVars),
            };
        })
    );
    log(buildingInfo);
    // We now have the build and its rooms, but we don't have the capacity of each room.
    // Fetching the capacities can take a long time, since it cannot be done in parallel.
    const completeBuildingInfo = await Promise.all(
        buildingInfo.map(async (info) => {
            const building = info.building;
            const rooms: RoomInfo[] = await Promise.all(
                info.rooms.map(
                    async (room) => await fetchRoomDetails(building, room)
                )
            );
            return {
                ...info,
                rooms,
            };
        })
    );
    log(completeBuildingInfo);
    return completeBuildingInfo;
}
