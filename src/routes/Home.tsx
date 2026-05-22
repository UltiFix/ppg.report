import Wind from "../features/wind/Wind";
import Search from "../search/Search";
import styled from "@emotion/styled";
import Locations from "../features/user/Locations";
import { useAppSelector } from "../hooks";
import { css } from "@emotion/react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { getTrimmedCoordinates } from "../helpers/coordinates";

const Container = styled.div`
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
`;

const StyledSearch = styled(Search)<{ hasLocations: boolean }>`
  margin: 4rem auto 0;

  ${({ hasLocations }) =>
    hasLocations &&
    css`
      @media (max-width: 600px) {
        margin-top: 0;
      }
    `}
`;

export default function Home() {
  const locations = useAppSelector((state) => state.user.recentLocations);
  const navigate = useNavigate();

  useEffect(() => {
    if (!locations || !locations.length) return;
    if (window.location.pathname !== "/") return;

    const loc = locations[0];

    navigate(`/${getTrimmedCoordinates(loc.lat, loc.lon)}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locations]);

  return (
    <Container>
      <Wind />
      <StyledSearch hasLocations={locations.length !== 0} />
      <Locations />
    </Container>
  );
}
