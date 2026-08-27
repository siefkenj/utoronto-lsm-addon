import React from "react";
import { useStoreActions, useStoreState } from "../store/hooks";
// Import as a module in your JS
import "react-bootstrap-typeahead/css/Typeahead.css";
import { formatCapacity, RoomInfo } from "../api/building-info";
import { ListGroup, OverlayTrigger, Popover } from "react-bootstrap";
import { HOURS_IN_CALENDAR } from "../store/store";

function militaryToStandard(hour: number) {
    if (hour < 12) {
        return `${hour}:00 am`;
    }
    return `${hour - 12}:00 pm`;
}

function isCourseCode(str: string): boolean {
    return !!str.match(/^[A-Z][A-Z][A-Z]\d\d\d/);
}

/**
 * Extract the course code and lecture section from a description string.
 * The description strings look like `"CHE1432H LEC 0101 20219 (A)"`
 */
function extractCourseInformation(desc: string) {
    const parts = desc.split(/\s+/);
    if (isCourseCode(parts[0] || "")) {
        return {
            course: parts[0] || "Unknown Course",
            section: `${parts[1]} ${parts[2]}`,
            desc,
        };
    }
    return { course: desc, section: "", desc };
}

function RoomInfoDisplay({ room }: { room: RoomInfo }) {
    const roomHash = `${room.building}-${room.room}`;

    return (
        <OverlayTrigger
            placement="right"
            trigger={["click"]}
            overlay={
                <Popover id={`popover-${roomHash}`}>
                    <Popover.Header>
                        {room.building} Room {room.room}
                    </Popover.Header>
                    <Popover.Body>
                        <ListGroup>
                            <ListGroup.Item>
                                Capacity: <b>{formatCapacity(room)}</b>
                            </ListGroup.Item>
                            {room.roomLayout && (
                                <ListGroup.Item>
                                    <a href={room.roomLayout}>
                                        Room Layout (PDF)
                                    </a>
                                </ListGroup.Item>
                            )}
                            <ListGroup.Item>
                                {room.photos.map((photoUrl) => (
                                    <a key={photoUrl} href={photoUrl}>
                                        <img
                                            alt="Building"
                                            src={photoUrl}
                                            style={{ width: 200 }}
                                        />
                                    </a>
                                ))}
                            </ListGroup.Item>
                        </ListGroup>
                    </Popover.Body>
                </Popover>
            }
        >
            <div className="room-info-display" tabIndex={10}>
                <h6>
                    {room.building} {room.room}
                </h6>
                Capacity {formatCapacity(room)}
            </div>
        </OverlayTrigger>
    );
}

export function RoomCalendar() {
    const activeRooms = useStoreState((state) => state.activeRooms);
    const activeBookingsCalendar = useStoreState(
        (state) => state.activeBookingsCalendar
    );
    const activeDate = useStoreState((state) => state.activeDate);
    const fetchBookings = useStoreActions((state) => state.fetchBookings);

    React.useEffect(() => {
        if (!activeDate) {
            return;
        }
        // Initiate a fetch of all booking information. This is cached, so it's
        // okay to call this multiple times.
        fetchBookings({
            date: activeDate,
            rooms: activeRooms.map((room) => [room.building, room.room]),
        });
    }, [activeDate, activeRooms, fetchBookings]);

    if (activeRooms.length === 0) {
        return <h4 className="my-4 text-center">No Room(s) Selected</h4>;
    }

    return (
        <table className="availability-table">
            <thead>
                <tr>
                    <th>
                        <i>Time (24 h)</i>
                    </th>
                    {HOURS_IN_CALENDAR.map((hour) => (
                        <th key={hour}>{hour}:00</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {activeBookingsCalendar.map((calendarRow) => {
                    const room = activeRooms.find(
                        (r) =>
                            r.room === calendarRow.room &&
                            r.building === calendarRow.building
                    );
                    if (!room) {
                        return null;
                    }
                    return (
                        <tr key={`${calendarRow.building} ${calendarRow.room}`}>
                            <th>
                                <RoomInfoDisplay room={room} />
                            </th>
                            {calendarRow.bookings.map((booking, i) => {
                                const hour = HOURS_IN_CALENDAR[i];
                                if (!booking) {
                                    const tooltip = `${calendarRow.building} ${
                                        calendarRow.room
                                    } is available at ${hour}:00 (${militaryToStandard(
                                        hour
                                    )})`;
                                    return (
                                        <td key={i}>
                                            <div
                                                className="booking no-booking"
                                                title={tooltip}
                                            >
                                                Available
                                            </div>
                                        </td>
                                    );
                                }
                                const descParts = extractCourseInformation(
                                    booking.desc
                                );
                                const tooltip = `${calendarRow.building} ${
                                    calendarRow.room
                                } is booked at ${hour}:00 (${militaryToStandard(
                                    hour
                                )}) by ${booking.desc}`;

                                return (
                                    <td key={i}>
                                        <div
                                            className="booking"
                                            title={tooltip}
                                        >
                                            <div className="course-code">
                                                {descParts.course}
                                            </div>
                                            <div className="course-section">
                                                {descParts.section}
                                            </div>
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
